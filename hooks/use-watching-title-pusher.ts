"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPusherClient, isPusherClientConfigured } from "@/lib/pusher/client";
import { getWatchingTitleChannelName, PUSHER_EVENTS } from "@/lib/pusher/channels";

/** Subscribes to per-title watching presence updates (watchers, thoughts, reactions). */
export function useWatchingTitlePusher(
  tmdbId: number,
  mediaType: "movie" | "tv",
  enabled = true
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || tmdbId <= 0 || !isPusherClientConfigured()) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = getWatchingTitleChannelName(mediaType, tmdbId);
    const channel = pusher.subscribe(channelName);

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["watching-title", tmdbId, mediaType] });
      queryClient.invalidateQueries({ queryKey: ["watching-thought-replies"] });
    };

    channel.bind(PUSHER_EVENTS.WATCHING_TITLE_UPDATED, handleUpdate);

    return () => {
      channel.unbind(PUSHER_EVENTS.WATCHING_TITLE_UPDATED, handleUpdate);
      pusher.unsubscribe(channelName);
    };
  }, [enabled, mediaType, queryClient, tmdbId]);
}
