import Pusher from "pusher";
import {
  getActivityFeedChannelName,
  getContentReactionsChannelName,
  getForumPostChannelName,
  getListCommentsChannelName,
  getReviewsChannelName,
  getUserChannelName,
  getViewingLogCommentsChannelName,
  PUSHER_EVENTS,
} from "@/lib/pusher/channels";

let pusherServer: Pusher | null = null;

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required Pusher env var: ${name}`);
  }
  return value;
}

export function isPusherServerConfigured() {
  return Boolean(
    process.env.PUSHER_APP_ID &&
      process.env.PUSHER_KEY &&
      process.env.PUSHER_SECRET &&
      process.env.PUSHER_CLUSTER
  );
}

export function getPusherServer() {
  if (!isPusherServerConfigured()) {
    throw new Error("Pusher server is not configured");
  }

  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: getRequiredEnv("PUSHER_APP_ID"),
      key: getRequiredEnv("PUSHER_KEY"),
      secret: getRequiredEnv("PUSHER_SECRET"),
      cluster: getRequiredEnv("PUSHER_CLUSTER"),
      useTLS: true,
    });
  }

  return pusherServer;
}

async function triggerChannelEvent(channel: string, event: string, payload: Record<string, unknown>) {
  if (!isPusherServerConfigured()) return;
  try {
    await getPusherServer().trigger(channel, event, {
      ...payload,
      triggeredAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[Pusher] Failed to trigger ${event} on ${channel}:`, error);
  }
}

export async function triggerForumPostUpdated(postId: string, payload: Record<string, unknown> = {}) {
  await triggerChannelEvent(getForumPostChannelName(postId), PUSHER_EVENTS.FORUM_POST_UPDATED, {
    postId,
    ...payload,
  });
}

export async function triggerUserNotificationsChanged(
  userIds: string[],
  scope: "general" | "forum" | "youtube",
  payload: Record<string, unknown> = {}
) {
  if (!isPusherServerConfigured()) return;

  const eventName =
    scope === "general"
      ? PUSHER_EVENTS.GENERAL_NOTIFICATIONS_CHANGED
      : scope === "forum"
        ? PUSHER_EVENTS.FORUM_NOTIFICATIONS_CHANGED
        : PUSHER_EVENTS.YOUTUBE_NOTIFICATIONS_CHANGED;

  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  await Promise.all(
    uniqueUserIds.map((userId) =>
      triggerChannelEvent(getUserChannelName(userId), eventName, {
        userId,
        scope,
        ...payload,
      })
    )
  );
}

export async function triggerReviewsUpdated(mediaType: "movie" | "tv", tmdbId: number) {
  await triggerChannelEvent(
    getReviewsChannelName(mediaType, tmdbId),
    PUSHER_EVENTS.REVIEWS_UPDATED,
    { mediaType, tmdbId }
  );
}

export async function triggerContentReactionsUpdated(mediaType: "movie" | "tv", tmdbId: number) {
  await triggerChannelEvent(
    getContentReactionsChannelName(mediaType, tmdbId),
    PUSHER_EVENTS.CONTENT_REACTIONS_UPDATED,
    { mediaType, tmdbId }
  );
}

export async function triggerListCommentsUpdated(listId: string, payload: Record<string, unknown> = {}) {
  await triggerChannelEvent(
    getListCommentsChannelName(listId),
    PUSHER_EVENTS.LIST_COMMENTS_UPDATED,
    { listId, ...payload }
  );
}

export async function triggerViewingLogCommentsUpdated(logId: string, payload: Record<string, unknown> = {}) {
  await triggerChannelEvent(
    getViewingLogCommentsChannelName(logId),
    PUSHER_EVENTS.VIEWING_LOG_COMMENTS_UPDATED,
    { logId, ...payload }
  );
}

export async function triggerActivityFeedUpdated(payload: Record<string, unknown> = {}) {
  await triggerChannelEvent(
    getActivityFeedChannelName(),
    PUSHER_EVENTS.ACTIVITY_FEED_UPDATED,
    payload
  );
}
