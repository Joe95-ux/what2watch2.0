import { db } from "@/lib/db";
import { isActiveWatchPartyParticipant } from "@/lib/watch-party/participant-active";
import { normalizeWatchPartyStatus } from "@/lib/watch-party/room-summary-server";

/** Other users in the same open watch parties (for feed / watcher visibility). */
export async function getActiveWatchPartyPeerUserIds(userId: string): Promise<string[]> {
  const memberships = await db.watchPartyParticipant.findMany({
    where: { userId },
    select: {
      leftAt: true,
      roomId: true,
      room: { select: { status: true } },
    },
  });

  const openRoomIds = memberships
    .filter(
      (m) =>
        isActiveWatchPartyParticipant(m.leftAt) &&
        normalizeWatchPartyStatus(m.room.status) === "OPEN"
    )
    .map((m) => m.roomId);

  if (!openRoomIds.length) return [];

  const peers = await db.watchPartyParticipant.findMany({
    where: { roomId: { in: openRoomIds }, userId: { not: userId } },
    select: { userId: true, leftAt: true },
  });

  return [
    ...new Set(peers.filter((p) => isActiveWatchPartyParticipant(p.leftAt)).map((p) => p.userId)),
  ];
}

export function mergeNetworkUserIds(
  currentUserId: string,
  followingIds: string[],
  partyPeerIds: string[]
): string[] {
  return [...new Set([currentUserId, ...followingIds, ...partyPeerIds])];
}
