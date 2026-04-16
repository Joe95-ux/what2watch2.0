import Pusher from "pusher";
import {
  getForumPostChannelName,
  getUserChannelName,
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
