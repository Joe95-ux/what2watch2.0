import { db } from "@/lib/db";
import { watchPartyFeedRoomKey } from "@/lib/watch-party-feed-key";

export type WatchPartyRoomStatus = "OPEN" | "ENDED";

export type WatchPartyRoomSummaryPayload = {
  id: string;
  title: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  feedRoomKey: string;
  participantCount: number;
  isHost: boolean;
  isParticipant: boolean;
  participants: Array<{
    userId: string;
    name: string;
    avatarUrl: string | null;
  }>;
  status: WatchPartyRoomStatus;
};

export function isValidWatchPartyRoomId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id.trim());
}

export function normalizeWatchPartyStatus(status: string | null | undefined): WatchPartyRoomStatus {
  return String(status ?? "OPEN").toUpperCase() === "ENDED" ? "ENDED" : "OPEN";
}

/** Upsert active membership for a user on an open party. */
export async function upsertWatchPartyParticipant(
  roomId: string,
  userId: string,
  hostUserId: string
): Promise<void> {
  const existing = await db.watchPartyParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });

  if (existing) {
    if (existing.leftAt != null) {
      await db.watchPartyParticipant.update({
        where: { id: existing.id },
        data: { leftAt: null, joinedAt: new Date() },
      });
    }
    return;
  }

  await db.watchPartyParticipant.create({
    data: {
      roomId,
      userId,
      role: userId === hostUserId ? "HOST" : "GUEST",
    },
  });
}

export async function getWatchPartyRoomSummaryForUser(
  roomId: string,
  userId: string
): Promise<WatchPartyRoomSummaryPayload | null> {
  const room = await db.watchPartyRoom.findFirst({
    where: { id: roomId },
    select: {
      id: true,
      hostUserId: true,
      status: true,
      tmdbId: true,
      mediaType: true,
      title: true,
      seasonNumber: true,
      episodeNumber: true,
    },
  });

  if (!room) return null;

  const status = normalizeWatchPartyStatus(room.status);
  const activeCount = await db.watchPartyParticipant.count({
    where: { roomId: room.id, leftAt: null },
  });

  const myParticipation = await db.watchPartyParticipant.findUnique({
    where: { roomId_userId: { roomId: room.id, userId } },
    select: { leftAt: true },
  });
  const isParticipant = Boolean(myParticipation && myParticipation.leftAt == null);

  const participants = isParticipant
    ? (
        await db.watchPartyParticipant.findMany({
          where: { roomId: room.id, leftAt: null },
          orderBy: { joinedAt: "asc" },
          take: 24,
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        })
      ).map((p) => ({
        userId: p.userId,
        name: p.user.displayName || p.user.username || "Unknown",
        avatarUrl: p.user.avatarUrl,
      }))
    : [];

  const mediaType = room.mediaType === "tv" ? "tv" : "movie";
  const feedRoomKey = watchPartyFeedRoomKey(
    room.tmdbId,
    mediaType,
    room.seasonNumber,
    room.episodeNumber
  );

  return {
    id: room.id,
    title: room.title,
    tmdbId: room.tmdbId,
    mediaType,
    feedRoomKey,
    participantCount: activeCount,
    isHost: room.hostUserId === userId,
    isParticipant,
    participants,
    status,
  };
}
