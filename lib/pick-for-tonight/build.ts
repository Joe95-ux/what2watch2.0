import { buildLightPool } from "@/lib/pick-for-tonight/build-pool";
import { recordPickHistory } from "@/lib/pick-for-tonight/history";
import type { BuildPickInput, PickForTonightApiResult } from "@/lib/pick-for-tonight/internal-types";
import { presentFromLightBatch } from "@/lib/pick-for-tonight/present";

export type { PickForTonightApiResult };

/** Full pipeline: Layer A pool → enrich → Layer B present. */
export async function buildPickForTonightResult(
  userId: string,
  input: BuildPickInput
): Promise<PickForTonightApiResult> {
  const { onlyUnseen, trendingToday, rerankMode, avoidTmdbId, avoidLeadGenre, writeCooldownLog } = input;

  const poolResult = await buildLightPool(userId, { onlyUnseen, trendingToday });

  if (poolResult.insufficientMessage || poolResult.toEnrich.length === 0) {
    return {
      insufficientContext: true,
      message: poolResult.insufficientMessage ?? "Add titles to your library first.",
    };
  }

  const { picks, pool } = await presentFromLightBatch({
    lightBatch: poolResult.toEnrich,
    anchorById: poolResult.anchorById,
    context: poolResult.context,
    rerankMode,
    avoidLeadGenre,
    avoidTmdbId,
  });

  if (writeCooldownLog) {
    await recordPickHistory(userId, picks);
  }

  return { picks, pool };
}
