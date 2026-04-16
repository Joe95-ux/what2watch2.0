import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  POLLING_INTERVALS,
  checkForUpdates,
  createPollingManager,
} from "@/lib/services/forum-realtime.service";

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
  const lastUpdateTimeRef = useRef<Date>(new Date());
  const [isOnline, setIsOnline] = useState(true);
  const [errorCount, setErrorCount] = useState(0);
  const pollingManagerRef = useRef<ReturnType<typeof createPollingManager> | null>(null);

  useEffect(() => {
    lastUpdateTimeRef.current = lastUpdateTime;
  }, [lastUpdateTime]);

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
    if (pollingManagerRef.current) {
      pollingManagerRef.current.destroy();
      pollingManagerRef.current = null;
    }

    if (!enabled || !postId || !isOnline) return;

    const poll = async () => {
      try {
        const updates = await checkForUpdates(postId, lastUpdateTimeRef.current);
        if (errorCount > 0) setErrorCount(0);
        if (updates.length > 0) {
          queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
          queryClient.invalidateQueries({ queryKey: ["forum-post-replies", postId] });
          queryClient.invalidateQueries({ queryKey: ["forum-post-reaction", postId] });
          const now = new Date();
          lastUpdateTimeRef.current = now;
          setLastUpdateTime(now);
        }
      } catch {
        setErrorCount((prev) => Math.min(prev + 1, 5)); // Cap at 5
      }
    };

    const manager = createPollingManager(poll, interval);
    const backoffInterval = Math.min(interval * Math.pow(2, errorCount), POLLING_INTERVALS.BACKGROUND);
    manager.setInterval(backoffInterval);
    manager.start();
    pollingManagerRef.current = manager;

    return () => {
      manager.destroy();
      pollingManagerRef.current = null;
    };
  }, [postId, enabled, interval, queryClient, isOnline, errorCount]);

  return {
    lastUpdateTime,
    reset: () => setLastUpdateTime(new Date()),
  };
}

