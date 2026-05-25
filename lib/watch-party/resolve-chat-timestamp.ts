import { resolveWatchPartyTimelineTimestampSec } from "@/lib/watch-party/resolve-timeline-timestamp";

export async function resolveWatchPartyMessageTimestampSec(
  roomId: string,
  userId: string,
  clientTimestampSec?: number | null
): Promise<number | null> {
  return resolveWatchPartyTimelineTimestampSec(roomId, userId, clientTimestampSec);
}
