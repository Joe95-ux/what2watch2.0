"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getPusherClient } from "@/lib/pusher/client";
import { getUserChannelName, PUSHER_EVENTS } from "@/lib/pusher/channels";

const EVENT_BY_SCOPE = {
  general: PUSHER_EVENTS.GENERAL_NOTIFICATIONS_CHANGED,
  forum: PUSHER_EVENTS.FORUM_NOTIFICATIONS_CHANGED,
  youtube: PUSHER_EVENTS.YOUTUBE_NOTIFICATIONS_CHANGED,
} as const;

export function usePusherNotificationRealtime(scope: "general" | "forum" | "youtube") {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  useEffect(() => {
    if (!currentUser?.id) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = getUserChannelName(currentUser.id);
    const eventName = EVENT_BY_SCOPE[scope];
    const channel = pusher.subscribe(channelName);
    const handleInvalidate = () => {
      queryClient.invalidateQueries({ queryKey: [`${scope}-notifications`] });
    };

    channel.bind(eventName, handleInvalidate);

    return () => {
      channel.unbind(eventName, handleInvalidate);
    };
  }, [currentUser?.id, queryClient, scope]);
}
