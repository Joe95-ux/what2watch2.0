"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPusherClient } from "@/lib/pusher/client";
import { getWatchPartyRoomChannelName, PUSHER_EVENTS } from "@/lib/pusher/channels";

export function useWatchPartyRoomPusher(roomId: string | null, enabled = true) {
  const queryClient = useQueryClient();

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
        queryClient.setQueryData(
          ["watch-party-room", roomId],
          (current: { status?: string } | undefined) =>
            current ? { ...current, status: "ENDED" } : current
        );
      }
      handleUpdate();
    };

    channel.bind(PUSHER_EVENTS.WATCH_PARTY_ROOM_UPDATED, handleRoomUpdated);
    channel.bind(PUSHER_EVENTS.WATCH_PARTY_PARTICIPANTS_UPDATED, handleUpdate);
    channel.bind(PUSHER_EVENTS.WATCH_PARTY_CHAT_UPDATED, handleUpdate);
    channel.bind(PUSHER_EVENTS.WATCH_PARTY_REACTIONS_UPDATED, handleUpdate);
    channel.bind(PUSHER_EVENTS.WATCH_PARTY_HOST_CONTROLS_UPDATED, handleUpdate);

    return () => {
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_ROOM_UPDATED, handleRoomUpdated);
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_PARTICIPANTS_UPDATED, handleUpdate);
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_CHAT_UPDATED, handleUpdate);
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_REACTIONS_UPDATED, handleUpdate);
      channel.unbind(PUSHER_EVENTS.WATCH_PARTY_HOST_CONTROLS_UPDATED, handleUpdate);
      pusher.unsubscribe(channelName);
    };
  }, [enabled, roomId, queryClient]);
}
