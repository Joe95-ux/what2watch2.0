import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getForumPostChannelName,
  PUSHER_EVENTS,
} from "@/lib/pusher/channels";
import { getPusherClient } from "@/lib/pusher/client";

/**
 * Hook for real-time forum updates via Pusher.
 */
export function useForumRealtimeUpdates(
  postId: string | null,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  useEffect(() => {
    if (!enabled || !postId) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const channelName = getForumPostChannelName(postId);
    const channel = pusher.subscribe(channelName);

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
      queryClient.invalidateQueries({ queryKey: ["forum-post-replies", postId] });
      queryClient.invalidateQueries({ queryKey: ["forum-post-reaction", postId] });
      setLastUpdateTime(new Date());
    };
    channel.bind(PUSHER_EVENTS.FORUM_POST_UPDATED, handleUpdate);

    return () => {
      channel.unbind(PUSHER_EVENTS.FORUM_POST_UPDATED, handleUpdate);
      pusher.unsubscribe(channelName);
    };
  }, [postId, enabled, queryClient]);

  return {
    lastUpdateTime,
    reset: () => setLastUpdateTime(new Date()),
  };
}

