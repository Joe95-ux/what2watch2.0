import Pusher from "pusher";
import {
  getActivityFeedChannelName,
  getContentReactionsChannelName,
  getForumPostChannelName,
  getListCommentsChannelName,
  getListChannelName,
  getPlaylistChannelName,
  getYouTubeChannelListChannelName,
  getYouTubeChannelListsGlobalChannelName,
  getReviewsChannelName,
  getUserChannelName,
  getViewingLogCommentsChannelName,
  getWatchingDashboardChannelName,
  getWatchingTitleChannelName,
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

export async function triggerListUpdated(listId: string, payload: Record<string, unknown> = {}) {
  await triggerChannelEvent(
    getListChannelName(listId),
    PUSHER_EVENTS.LIST_UPDATED,
    { listId, ...payload }
  );
}

export async function triggerPlaylistUpdated(playlistId: string, payload: Record<string, unknown> = {}) {
  await triggerChannelEvent(
    getPlaylistChannelName(playlistId),
    PUSHER_EVENTS.PLAYLIST_UPDATED,
    { playlistId, ...payload }
  );
}

export async function triggerListAnalyticsUpdated(ownerId: string, payload: Record<string, unknown> = {}) {
  await triggerChannelEvent(
    getUserChannelName(ownerId),
    PUSHER_EVENTS.LIST_ANALYTICS_UPDATED,
    { ownerId, ...payload }
  );
}

export async function triggerPlaylistAnalyticsUpdated(ownerId: string, payload: Record<string, unknown> = {}) {
  await triggerChannelEvent(
    getUserChannelName(ownerId),
    PUSHER_EVENTS.PLAYLIST_ANALYTICS_UPDATED,
    { ownerId, ...payload }
  );
}

export async function triggerYouTubeChannelListUpdated(listId: string, payload: Record<string, unknown> = {}) {
  await triggerChannelEvent(
    getYouTubeChannelListChannelName(listId),
    PUSHER_EVENTS.YOUTUBE_CHANNEL_LIST_UPDATED,
    { listId, ...payload }
  );
  await triggerChannelEvent(
    getYouTubeChannelListsGlobalChannelName(),
    PUSHER_EVENTS.YOUTUBE_CHANNEL_LIST_UPDATED,
    { listId, ...payload }
  );
}

export async function triggerYouTubeListAnalyticsUpdated(ownerId: string, payload: Record<string, unknown> = {}) {
  await triggerChannelEvent(
    getUserChannelName(ownerId),
    PUSHER_EVENTS.YOUTUBE_LIST_ANALYTICS_UPDATED,
    { ownerId, ...payload }
  );
}

export async function triggerWatchingDashboardUpdated(payload: Record<string, unknown> = {}) {
  await triggerChannelEvent(
    getWatchingDashboardChannelName(),
    PUSHER_EVENTS.WATCHING_DASHBOARD_UPDATED,
    payload
  );
}

export async function triggerWatchingTitleUpdated(
  mediaType: "movie" | "tv",
  tmdbId: number,
  payload: Record<string, unknown> = {}
) {
  await triggerChannelEvent(
    getWatchingTitleChannelName(mediaType, tmdbId),
    PUSHER_EVENTS.WATCHING_TITLE_UPDATED,
    { mediaType, tmdbId, ...payload }
  );
}
