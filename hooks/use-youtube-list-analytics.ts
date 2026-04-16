"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getPusherClient } from "@/lib/pusher/client";
import { getUserChannelName, PUSHER_EVENTS } from "@/lib/pusher/channels";

/**
 * Keeps owner-facing YouTube list analytics views fresh in realtime.
 */
export function useYouTubeListAnalyticsRealtime() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  useEffect(() => {
    if (!currentUser?.id) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = getUserChannelName(currentUser.id);
    const channel = pusher.subscribe(channelName);
    const handleAnalyticsUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-lists", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-list-analytics-summary"] });
    };

    channel.bind(
      PUSHER_EVENTS.YOUTUBE_LIST_ANALYTICS_UPDATED,
      handleAnalyticsUpdate
    );
    return () => {
      channel.unbind(
        PUSHER_EVENTS.YOUTUBE_LIST_ANALYTICS_UPDATED,
        handleAnalyticsUpdate
      );
    };
  }, [currentUser?.id, queryClient]);
}
