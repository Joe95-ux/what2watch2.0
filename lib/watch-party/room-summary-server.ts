import { db } from "@/lib/db";
import { watchPartyFeedRoomKey } from "@/lib/watch-party-feed-key";
import { isActiveWatchPartyParticipant } from "@/lib/watch-party/participant-active";

export type WatchPartyRoomStatus = "OPEN" | "ENDED";

export type WatchPartyRoomSummaryPayload = {
  id: string;
  title: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  posterPath: string | null;
  backdropPath: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  feedRoomKey: string;
  participantCount: number;
  isHost: boolean;
  isParticipant: boolean;
  participants: Array<{
    userId: string;
    name: string;
    avatarUrl: string | null;
    role: "HOST" | "GUEST";
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
    if (!isActiveWatchPartyParticipant(existing.leftAt)) {
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

export async function findActiveWatchPartyParticipant(roomId: string, userId: string) {
  const row = await db.watchPartyParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { id: true, leftAt: true },
  });
  if (!row || !isActiveWatchPartyParticipant(row.leftAt)) return null;
  return row;
}

/** Load active party members (Prisma `leftAt: null` misses unset fields on Mongo). */
export async function listActiveWatchPartyParticipants(roomId: string) {
  const rows = await db.watchPartyParticipant.findMany({
    where: { roomId },
    orderBy: { joinedAt: "asc" },
    take: 48,
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });
  return rows.filter((p) => isActiveWatchPartyParticipant(p.leftAt));
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
      posterPath: true,
      backdropPath: true,
      seasonNumber: true,
      episodeNumber: true,
    },
  });

  if (!room) return null;

  // Host should always have a row after ensure; heal legacy rooms on read.
  if (room.hostUserId === userId) {
    const hostRow = await db.watchPartyParticipant.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
      select: { leftAt: true },
    });
    if (!hostRow || !isActiveWatchPartyParticipant(hostRow.leftAt)) {
      await upsertWatchPartyParticipant(room.id, userId, room.hostUserId);
    }
  }

  const status = normalizeWatchPartyStatus(room.status);
  const activeRows = await listActiveWatchPartyParticipants(room.id);
  const activeCount = activeRows.length;

  const myParticipation = await db.watchPartyParticipant.findUnique({
    where: { roomId_userId: { roomId: room.id, userId } },
    select: { leftAt: true },
  });
  const isParticipant = Boolean(
    myParticipation && isActiveWatchPartyParticipant(myParticipation.leftAt)
  );

  const participants = isParticipant
    ? activeRows.slice(0, 24).map((p) => ({
        userId: p.userId,
        name: p.user.displayName || p.user.username || "Unknown",
        avatarUrl: p.user.avatarUrl,
        role: p.role === "HOST" ? ("HOST" as const) : ("GUEST" as const),
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
    posterPath: room.posterPath,
    backdropPath: room.backdropPath,
    seasonNumber: room.seasonNumber,
    episodeNumber: room.episodeNumber,
    feedRoomKey,
    participantCount: activeCount,
    isHost: room.hostUserId === userId,
    isParticipant,
    participants,
    status,
  };
}
