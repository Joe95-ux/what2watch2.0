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
  const [isOnline, setIsOnline] = useState(true);
  const [errorCount, setErrorCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setErrorCount(0); // Reset error count when coming back online
    };
    const handleOffline = () => setIsOnline(false);

    // Check initial online status
    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !postId || !isOnline) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Calculate backoff interval based on error count (exponential backoff)
    // Max backoff: 60 seconds
    const backoffInterval = Math.min(
      interval * Math.pow(2, errorCount),
      POLLING_INTERVALS.BACKGROUND * 2
    );

    const poll = async () => {
      try {
        const updates = await checkForUpdates(postId, lastUpdateTime);
        
        // Reset error count on successful poll
        if (errorCount > 0) {
          setErrorCount(0);
        }
        
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
        // Only log error if it's not a network error (to reduce console spam)
        const isNetworkError = error instanceof TypeError && 
          (error.message.includes("fetch") || error.message.includes("NetworkError"));
        
        if (!isNetworkError) {
          console.error("Error polling for updates:", error);
        }
        
        // Increment error count for backoff
        setErrorCount((prev) => Math.min(prev + 1, 5)); // Cap at 5
      }
    };

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Initial poll
    poll();

    // Set up interval with backoff
    intervalRef.current = setInterval(poll, backoffInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [postId, enabled, interval, lastUpdateTime, queryClient, isOnline, errorCount]);

  return {
    lastUpdateTime,
    reset: () => setLastUpdateTime(new Date()),
  };
}

