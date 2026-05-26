import { db } from "@/lib/db";
import { publishUserNotification } from "@/lib/pusher/beams-server";
import { triggerUserNotificationsChanged } from "@/lib/pusher/server";
import { buildWatchPartyInviteUrl } from "@/lib/watch-party/invite-path";

const NOTIFY_CHUNK = 100;

export type NotifyWatchPartyHostLiveInput = {
  hostUserId: string;
  roomId: string;
  title: string;
  feedRoomKey: string;
  mediaType: "movie" | "tv";
  tmdbId: number;
};

/** Notify followers when a host opens a new watch party. */
export async function notifyWatchPartyHostLive(input: NotifyWatchPartyHostLiveInput): Promise<void> {
  const host = await db.user.findUnique({
    where: { id: input.hostUserId },
    select: {
      id: true,
      username: true,
      displayName: true,
    },
  });
  if (!host) return;

  const hostName = host.displayName || host.username || "Someone you follow";
  const linkUrl = buildWatchPartyInviteUrl(input.roomId, input.feedRoomKey);
  const message = `${hostName} started a watch party for ${input.title}. Join now!`;
  const title = `${hostName} is live — watch party`;

  const follows = await db.follow.findMany({
    where: { followingId: input.hostUserId },
    select: {
      followerId: true,
      follower: {
        select: {
          id: true,
          notifyOnWatchPartyLive: true,
        },
      },
    },
  });

  const recipientIds = [
    ...new Set(
      follows
        .filter((f) => f.followerId !== input.hostUserId)
        .filter((f) => f.follower.notifyOnWatchPartyLive !== false)
        .map((f) => f.followerId)
    ),
  ];

  if (!recipientIds.length) return;

  for (let i = 0; i < recipientIds.length; i += NOTIFY_CHUNK) {
    const chunk = recipientIds.slice(i, i + NOTIFY_CHUNK);
    await db.generalNotification.createMany({
      data: chunk.map((userId) => ({
        userId,
        type: "WATCH_PARTY_HOST_LIVE",
        title,
        message,
        linkUrl,
        metadata: {
          roomId: input.roomId,
          hostUserId: input.hostUserId,
          feedRoomKey: input.feedRoomKey,
          tmdbId: input.tmdbId,
          mediaType: input.mediaType,
        },
        isRead: false,
      })),
    });
  }

  await triggerUserNotificationsChanged(recipientIds, "general", {
    source: "watch-party-host-live",
    roomId: input.roomId,
  });

  await publishUserNotification({
    userIds: recipientIds,
    title,
    body: message,
    linkUrl,
    data: { roomId: input.roomId, type: "WATCH_PARTY_HOST_LIVE" },
  });
}
