import { db } from "@/lib/db";
import type { PickForTonightCandidate } from "@/lib/pick-for-tonight-types";
import type { PickMedia } from "@/lib/pick-for-tonight/media";

/** Cooldown + analytics hook — abstracted from aiChatEvent for future pick_history table. */
export async function recordPickDismiss(
  userId: string,
  tmdbId: number,
  mediaType: PickMedia
): Promise<void> {
  await db.aiChatEvent
    .create({
      data: {
        userId,
        sessionId: `pick-tonight:${userId}`,
        userMessage: "pick-for-tonight/dismiss",
        intent: "RECOMMENDATION",
        aiResponse: null,
        resultsCount: 1,
        resultIds: [tmdbId],
        resultTypes: [mediaType],
      },
    })
    .catch(() => {});
}

export async function recordPickHistory(userId: string, picks: PickForTonightCandidate[]): Promise<void> {
  await db.aiChatEvent
    .create({
      data: {
        userId,
        sessionId: `pick-tonight:${userId}`,
        userMessage: "pick-for-tonight/cards",
        intent: "RECOMMENDATION",
        aiResponse: null,
        resultsCount: picks.length,
        resultIds: picks.map((p) => p.tmdbId),
        resultTypes: picks.map((p) => p.mediaType),
      },
    })
    .catch(() => {});
}
