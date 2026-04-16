import PushNotifications from "@pusher/push-notifications-server";
import { db } from "@/lib/db";

let beamsServer: PushNotifications | null = null;

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required Beams env var: ${name}`);
  }
  return value;
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function toAbsoluteUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return getAppUrl();
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${getAppUrl()}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function isBeamsConfigured() {
  return Boolean(
    process.env.PUSHER_BEAMS_INSTANCE_ID && process.env.PUSHER_BEAMS_SECRET_KEY
  );
}

export function getBeamsServer() {
  if (!isBeamsConfigured()) {
    throw new Error("Pusher Beams is not configured");
  }

  if (!beamsServer) {
    beamsServer = new PushNotifications({
      instanceId: getRequiredEnv("PUSHER_BEAMS_INSTANCE_ID"),
      secretKey: getRequiredEnv("PUSHER_BEAMS_SECRET_KEY"),
    });
  }

  return beamsServer;
}

export async function generateBeamsToken(userId: string) {
  if (!isBeamsConfigured()) {
    throw new Error("Pusher Beams is not configured");
  }

  return getBeamsServer().generateToken(userId);
}

interface PublishUserNotificationInput {
  userIds: string[];
  title: string;
  body?: string | null;
  linkUrl?: string | null;
  data?: Record<string, string>;
}

export async function publishUserNotification({
  userIds,
  title,
  body,
  linkUrl,
  data = {},
}: PublishUserNotificationInput) {
  if (!isBeamsConfigured()) return;

  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return;

  try {
    const enabledUsers = await db.user.findMany({
      where: {
        id: { in: uniqueUserIds },
        pushNotifications: true,
      },
      select: { id: true },
    });

    const enabledUserIds = enabledUsers.map((user) => user.id);
    if (enabledUserIds.length === 0) return;

    await getBeamsServer().publishToUsers(enabledUserIds, {
      web: {
        time_to_live: 60 * 60,
        notification: {
          title,
          body: body || undefined,
          icon: `${getAppUrl()}/web-app-manifest-192x192.png`,
          deep_link: toAbsoluteUrl(linkUrl),
          hide_notification_if_site_has_focus: true,
        },
        data,
      },
    });
  } catch (error) {
    console.error("[Beams] Failed to publish notification:", error);
  }
}
