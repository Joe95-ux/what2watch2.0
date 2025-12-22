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
  ACTIVE: 5000, // 5 seconds when user is active
  IDLE: 30000, // 30 seconds when user is idle
  BACKGROUND: 60000, // 60 seconds when tab is in background
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
  interval: number = POLLING_INTERVALS.ACTIVE
) {
  let intervalId: NodeJS.Timeout | null = null;
  let isActive = false;

  const start = () => {
    if (isActive) return;
    isActive = true;
    intervalId = setInterval(async () => {
      try {
        await callback();
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, interval);
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    isActive = false;
  };

  const setInterval = (newInterval: number) => {
    stop();
    interval = newInterval;
    if (isActive) {
      start();
    }
  };

  return {
    start,
    stop,
    setInterval: setIntervalTime,
    isActive: () => isActive,
  };
}

