/**
 * Service for real-time updates using polling
 * Separated from components for clear concerns
 */

export interface RealtimeUpdate {
  type: "reply" | "reaction" | "reply_reaction";
  postId: string;
  replyId?: string;
  timestamp: Date;
  data: any;
}

/**
 * Polling configuration
 */
export const POLLING_INTERVALS = {
  ACTIVE: 30000, // 30 seconds when user is active
  IDLE: 60000, // 60 seconds when user is idle / unfocused
  BACKGROUND: 120000, // 2 minutes when tab is in background
} as const;

/**
 * Check if there are new updates since a timestamp
 */
export async function checkForUpdates(
  postId: string,
  since: Date
): Promise<RealtimeUpdate[]> {
  // Check if we're online before attempting fetch
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return [];
  }

  try {
    // Create abort controller for timeout (fallback for browsers that don't support AbortSignal.timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(
      `/api/forum/posts/${postId}/updates?since=${since.toISOString()}`,
      {
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.updates || [];
  } catch (error) {
    // Only log non-network errors to reduce console spam
    const isNetworkError = error instanceof TypeError && 
      (error.message.includes("fetch") || error.message.includes("NetworkError") || error.name === "AbortError");
    
    if (!isNetworkError) {
      console.error("Error checking for updates:", error);
    }
    return [];
  }
}

/**
 * Create a polling hook helper
 */
export function createPollingManager(
  callback: () => Promise<void>,
  initialInterval: number = POLLING_INTERVALS.ACTIVE
) {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
  let isActive = false;
  let isRunning = false;
  let interval = initialInterval;
  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

  const getCurrentInterval = () => {
    if (!isBrowser) return interval;
    if (document.visibilityState === "hidden") return POLLING_INTERVALS.BACKGROUND;
    if (!document.hasFocus()) return POLLING_INTERVALS.IDLE;
    return interval;
  };

  const clearPendingTimeout = () => {
    if (!timeoutId) return;
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  const scheduleNextPoll = () => {
    if (!isActive) return;
    clearPendingTimeout();
    timeoutId = setTimeout(() => {
      void poll();
    }, getCurrentInterval());
  };

  const poll = async () => {
    if (!isActive || isRunning) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      scheduleNextPoll();
      return;
    }
    isRunning = true;
    try {
      await callback();
    } catch (error) {
      console.error("Polling error:", error);
    } finally {
      isRunning = false;
      scheduleNextPoll();
    }
  };

  const handleVisibilityOrFocusChange = () => {
    if (!isActive) return;
    scheduleNextPoll();
  };

  const start = () => {
    if (isActive) return;
    isActive = true;
    if (isBrowser) {
      document.addEventListener("visibilitychange", handleVisibilityOrFocusChange);
      window.addEventListener("focus", handleVisibilityOrFocusChange);
      window.addEventListener("blur", handleVisibilityOrFocusChange);
      window.addEventListener("online", handleVisibilityOrFocusChange);
    }
    void poll();
  };

  const stop = () => {
    if (!isActive) return;
    isActive = false;
    clearPendingTimeout();
    if (isBrowser) {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocusChange);
      window.removeEventListener("focus", handleVisibilityOrFocusChange);
      window.removeEventListener("blur", handleVisibilityOrFocusChange);
      window.removeEventListener("online", handleVisibilityOrFocusChange);
    }
  };

  const setPollingInterval = (newInterval: number) => {
    interval = newInterval;
    if (isActive) {
      scheduleNextPoll();
    }
  };

  return {
    start,
    stop,
    destroy: stop,
    setInterval: setPollingInterval,
    isActive: () => isActive,
  };
}

