"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPusherClient } from "@/lib/pusher/client";
import { getForumPostChannelName, PUSHER_EVENTS } from "@/lib/pusher/channels";

export function useForumPostPusher(postId: string | null, enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!postId || !enabled) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = getForumPostChannelName(postId);
    const channel = pusher.subscribe(channelName);
    const handlePostUpdate = () => {
      // Invalidate all forum post variants (slug/id keyed), reactions, and feed lists.
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [scope] = query.queryKey;
          return (
            scope === "forum-post" ||
            scope === "forum-reply" ||
            scope === "forum-posts" ||
            scope === "forum-posts-filter"
          );
        },
      });
    };

    channel.bind(PUSHER_EVENTS.FORUM_POST_UPDATED, handlePostUpdate);

    return () => {
      channel.unbind(PUSHER_EVENTS.FORUM_POST_UPDATED, handlePostUpdate);
      pusher.unsubscribe(channelName);
    };
  }, [enabled, postId, queryClient]);
}
