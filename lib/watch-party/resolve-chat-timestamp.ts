import { db } from "@/lib/db";
import { buildPlaybackSnapshotFromSession } from "@/lib/watch-party/host-controls";
import { resolveMessageTimestampSec } from "@/lib/watch-party/message-timestamp";

export async function resolveWatchPartyMessageTimestampSec(
  roomId: string,
  userId: string,
  clientTimestampSec?: number | null
): Promise<number | null> {
  const room = await db.watchPartyRoom.findFirst({
    where: { id: roomId },
    select: {
      tmdbId: true,
      mediaType: true,
      seasonNumber: true,
      episodeNumber: true,
      hostSyncElapsedMinutes: true,
      hostSyncRuntimeMinutes: true,
    },
  });
  if (!room) return null;

  const sessionWhere: {
    userId: string;
    tmdbId: number;
    mediaType: string;
    status: { in: string[] };
    seasonNumber?: number;
    episodeNumber?: number;
  } = {
    userId,
    tmdbId: room.tmdbId,
    mediaType: room.mediaType,
    status: { in: ["WATCHING_NOW", "STOPPED"] },
  };
  if (room.mediaType === "tv" && room.seasonNumber != null && room.episodeNumber != null) {
    sessionWhere.seasonNumber = room.seasonNumber;
    sessionWhere.episodeNumber = room.episodeNumber;
  }

  const watchingSession = await db.watchingSession.findFirst({
    where: sessionWhere,
    orderBy: { updatedAt: "desc" },
    select: {
      progressPercent: true,
      startedAt: true,
      status: true,
      updatedAt: true,
    },
  });

  let senderElapsedMinutes: number | null = null;
  let senderRuntimeMinutes: number | null = null;
  if (watchingSession) {
    const snapshot = buildPlaybackSnapshotFromSession({
      progressPercent: watchingSession.progressPercent,
      startedAt: watchingSession.startedAt.toISOString(),
      status: watchingSession.status,
      runtimeMinutes: null,
    });
    senderElapsedMinutes = snapshot.elapsedMinutes;
    senderRuntimeMinutes = snapshot.runtimeMinutes;
  }

  return resolveMessageTimestampSec({
    clientTimestampSec,
    hostSyncElapsedMinutes: room.hostSyncElapsedMinutes,
    hostSyncRuntimeMinutes: room.hostSyncRuntimeMinutes,
    senderElapsedMinutes,
    senderRuntimeMinutes,
  });
}
