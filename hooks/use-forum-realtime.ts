import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { POLLING_INTERVALS, checkForUpdates, RealtimeUpdate } from "@/lib/services/forum-realtime.service";

/**
 * Hook for real-time updates via polling
 */
export function useForumRealtimeUpdates(
  postId: string | null,
  enabled: boolean = true,
  interval: number = POLLING_INTERVALS.ACTIVE
) {
  const queryClient = useQueryClient();
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !postId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        const updates = await checkForUpdates(postId, lastUpdateTime);
        
        if (updates.length > 0) {
          // Invalidate relevant queries to trigger refetch
          queryClient.invalidateQueries({
            queryKey: ["forum-post", postId],
          });
          queryClient.invalidateQueries({
            queryKey: ["forum-post-replies", postId],
          });
          queryClient.invalidateQueries({
            queryKey: ["forum-post-reaction", postId],
          });
          
          setLastUpdateTime(new Date());
        }
      } catch (error) {
        console.error("Error polling for updates:", error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [postId, enabled, interval, lastUpdateTime, queryClient]);

  return {
    lastUpdateTime,
    reset: () => setLastUpdateTime(new Date()),
  };
}

