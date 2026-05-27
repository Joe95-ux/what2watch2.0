"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPusherClient } from "@/lib/pusher/client";
import { getWatchPartyRoomChannelName, PUSHER_EVENTS } from "@/lib/pusher/channels";
import type { WatchPartyHostControls } from "@/lib/watch-party/host-controls";
import type { WatchPartyRoomSummary } from "@/hooks/use-watch-party-room-summary";

const DASHBOARD_INVALIDATE_DEBOUNCE_MS = 2_500;

export function useWatchPartyRoomPusher(
  roomId: string | null,
  enabled = true,
  options?: {
    /** Called when host ends the party — clear URL and party UI immediately. */
    onPartyEnded?: (feedRoomKey: string | null) => void;
  }
) {
  const queryClient = useQueryClient();
  const onPartyEndedRef = useRef(options?.onPartyEnded);
  onPartyEndedRef.current = options?.onPartyEnded;
  const dashboardDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !roomId) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const invalidateRoom = () => {
      void queryClient.invalidateQueries({ queryKey: ["watch-party-room", roomId] });
    };

    const scheduleDashboardInvalidate = () => {
      if (dashboardDebounceRef.current) {
        window.clearTimeout(dashboardDebounceRef.current);
      }
      dashboardDebounceRef.current = window.setTimeout(() => {
        dashboardDebounceRef.current = null;
        void queryClient.invalidateQueries({ queryKey: ["watching-dashboard"] });
      }, DASHBOARD_INVALIDATE_DEBOUNCE_MS);
    };

    const channelName = getWatchPartyRoomChannelName(roomId);
    const channel = pusher.subscribe(channelName);

    const handleChatUpdate = () => {
      void queryClient.invalidateQueries({ queryKey: ["watch-party-chat", roomId] });
    };

    const handleReactionsUpdate = () => {
      void queryClient.invalidateQueries({ queryKey: ["watch-party-reactions", roomId] });
    };

    const handleMarkersUpdate = () => {
      void queryClient.invalidateQueries({ queryKey: ["watch-party-markers", roomId] });
    };

    /** Membership / roster changes — refresh party summary; debounce heavy dashboard GET. */
    const handleParticipantsUpdate = () => {
      invalidateRoom();
      scheduleDashboardInvalidate();
    };

    const handleRoomUpdated = (payload: { action?: string }) => {
      if (payload?.action === "ended") {
        const current = queryClient.getQueryData<{ status?: string; feedRoomKey?: string }>([
          "watch-party-room",
          roomId,
        ]);
        queryClient.setQueryData(
          ["watch-party-room", roomId],
          (prev: { status?: string; feedRoomKey?: string } | undefined) =>
            prev ? { ...prev, status: "ENDED" } : prev
        );
        onPartyEndedRef.current?.(current?.feedRoomKey ?? null);
        void queryClient.invalidateQueries({ queryKey: ["watching-dashboard"] });
        return;
      }
      if (payload?.action === "created") {
        invalidateRoom();
        void queryClient.invalidateQueries({ queryKey: ["watching-dashboard"] });
        return;
      }
      invalidateRoom();
    };

    const handleHostControlsUpdated = (payload: WatchPartyHostControls | Record<string, unknown>) => {
      if (payload && typeof payload === "object" && "updatedAt" in payload) {
        queryClient.setQueryData(
          ["watch-party-room", roomId],
          (prev: WatchPartyRoomSummary | undefined) =>
            prev ? { ...prev, hostControls: payload as WatchPartyHostControls } : prev
        );
      }
    };

    channel.bind(PUSHER_EVENTS.WATCH_PARTY_ROOM_UPDATED, handleRoomUpdated);
    channel.bind(PUSHER_EVENTS.WATCH_PARTY_PARTICIPANTS_UPDATED, handleParticipantsUpdate);
    channel.bind(PUSHER_EVENTS.WATCH_PARTY_CHAT_UPDATED, handleChatUpdate);
    channel.bind(PUSHER_EVENTS.WATCH_PARTY_REACTIONS_UPDATED, handleReactionsUpdate);
    channel.bind(PUSHER_EVENTS.WATCH_PARTY_MARKERS_UPDATED, handleMarkersUpdate);
    channel.bind(PUSHER_EVENTS.WATCH_PARTY_HOST_CONTROLS_UPDATED, handleHostControlsUpdated);

    return () => {
      if (dashboardDebounceRef.current) {
        window.clearTimeout(dashboardDebounceRef.current);
        dashboardDebounceRef.current = null;
      }
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_ROOM_UPDATED, handleRoomUpdated);
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_PARTICIPANTS_UPDATED, handleParticipantsUpdate);
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_CHAT_UPDATED, handleChatUpdate);
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_REACTIONS_UPDATED, handleReactionsUpdate);
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_MARKERS_UPDATED, handleMarkersUpdate);
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_HOST_CONTROLS_UPDATED, handleHostControlsUpdated);
      pusher.unsubscribe(channelName);
    };
  }, [enabled, roomId, queryClient]);
}
