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
  try {
    const response = await fetch(
      `/api/forum/posts/${postId}/updates?since=${since.toISOString()}`
    );
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.updates || [];
  } catch (error) {
    console.error("Error checking for updates:", error);
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

