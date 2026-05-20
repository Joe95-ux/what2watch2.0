"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPusherClient } from "@/lib/pusher/client";
import { getWatchPartyRoomChannelName, PUSHER_EVENTS } from "@/lib/pusher/channels";
import type { WatchPartyHostControls } from "@/lib/watch-party/host-controls";
import type { WatchPartyRoomSummary } from "@/hooks/use-watch-party-room-summary";

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

  useEffect(() => {
    if (!enabled || !roomId) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = getWatchPartyRoomChannelName(roomId);
    const channel = pusher.subscribe(channelName);
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["watch-party-room", roomId] });
      queryClient.invalidateQueries({ queryKey: ["watch-party-chat", roomId] });
      queryClient.invalidateQueries({ queryKey: ["watch-party-reactions", roomId] });
      queryClient.invalidateQueries({ queryKey: ["watching-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["watching-title"] });
      queryClient.invalidateQueries({ queryKey: ["watching-replies-to-you"] });
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
        queryClient.invalidateQueries({ queryKey: ["watching-dashboard"] });
        return;
      }
      handleUpdate();
    };

    const handleHostControlsUpdated = (payload: WatchPartyHostControls | Record<string, unknown>) => {
      if (payload && typeof payload === "object" && "updatedAt" in payload) {
        queryClient.setQueryData(
          ["watch-party-room", roomId],
          (prev: WatchPartyRoomSummary | undefined) =>
            prev ? { ...prev, hostControls: payload as WatchPartyHostControls } : prev
        );
      }
      handleUpdate();
    };

    channel.bind(PUSHER_EVENTS.WATCH_PARTY_ROOM_UPDATED, handleRoomUpdated);
    channel.bind(PUSHER_EVENTS.WATCH_PARTY_PARTICIPANTS_UPDATED, handleUpdate);
    channel.bind(PUSHER_EVENTS.WATCH_PARTY_CHAT_UPDATED, handleUpdate);
    channel.bind(PUSHER_EVENTS.WATCH_PARTY_REACTIONS_UPDATED, handleUpdate);
    channel.bind(PUSHER_EVENTS.WATCH_PARTY_HOST_CONTROLS_UPDATED, handleHostControlsUpdated);

    return () => {
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_ROOM_UPDATED, handleRoomUpdated);
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_PARTICIPANTS_UPDATED, handleUpdate);
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_CHAT_UPDATED, handleUpdate);
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_REACTIONS_UPDATED, handleUpdate);
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_HOST_CONTROLS_UPDATED, handleHostControlsUpdated);
      pusher.unsubscribe(channelName);
    };
  }, [enabled, roomId, queryClient]);
}
