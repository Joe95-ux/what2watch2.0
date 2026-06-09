import { calculateContentMatchPercent } from "@/lib/content-match-percent";
import { PRESENT_PICK_LIMIT, PRESENT_POOL_LIMIT } from "@/lib/pick-for-tonight/constants";
import { enrichBatch } from "@/lib/pick-for-tonight/enrich";
import type { LightCandidate, PickTonightAnchor, UserPickContext } from "@/lib/pick-for-tonight/internal-types";
import { buildWhyTonightFromReasons } from "@/lib/pick-for-tonight/reasons";
import type { RerankMode } from "@/lib/pick-for-tonight/internal-types";
import { rerankPicks, selectDiversePicks } from "@/lib/pick-for-tonight/score";
import type { PickForTonightCandidate } from "@/lib/pick-for-tonight-types";
import { EMPTY_PICK_TONIGHT_ANCHOR } from "@/lib/pick-for-tonight/anchors";

export type PresentInput = {
  lightBatch: LightCandidate[];
  anchorById: Map<string, PickTonightAnchor>;
  context: UserPickContext;
  rerankMode: RerankMode | null;
  avoidLeadGenre: string | null;
  avoidTmdbId: number | null;
};

export async function presentFromLightBatch(input: PresentInput): Promise<{
  picks: PickForTonightCandidate[];
  pool: PickForTonightCandidate[];
}> {
  const { lightBatch, anchorById, context, rerankMode, avoidLeadGenre, avoidTmdbId } = input;
  const reasonsById = new Map(lightBatch.map((c) => [c.id, c.reasons]));

  let batch = lightBatch;
  if (avoidTmdbId != null) {
    batch = batch.filter((c) => c.tmdbId !== avoidTmdbId);
  }

  const enriched = await enrichBatch(batch);
  const withMatch = enriched.map((pick) => ({
    ...pick,
    matchPercent: calculateContentMatchPercent({
      genreIds: pick.genreIds,
      mediaType: pick.mediaType,
      favoriteGenres: context.favoriteGenres,
      dislikedGenres: context.dislikedGenres,
      preferredTypes: context.preferredTypes,
      voteAverage: pick.imdbRating,
      inWatchlist: pick.hints.some(
        (h) => h === "Watchlist" || h.startsWith("List:") || h.startsWith("Playlist:")
      ),
    }),
  }));

  const withWhy = withMatch.map((pick) => {
    const reasons = reasonsById.get(pick.id) ?? [];
    const primaryGenre = pick.genreNames[0]?.trim();
    if (primaryGenre && !reasons.some((r) => r.code === "taste" || r.code === "discovery")) {
      reasons.push({ code: "taste", weight: 2, genre: primaryGenre });
    }
    return {
      ...pick,
      whyTonight: buildWhyTonightFromReasons(
        reasons,
        anchorById.get(pick.id) ?? EMPTY_PICK_TONIGHT_ANCHOR,
        primaryGenre
      ),
    };
  });

  const pool = selectDiversePicks(rerankPicks(withWhy, null), PRESENT_POOL_LIMIT).map(({ pick }) => pick);
  const picks = selectDiversePicks(
    rerankPicks(withWhy, rerankMode, { avoidLeadGenre }),
    PRESENT_PICK_LIMIT
  ).map(({ pick }) => pick);

  return { picks, pool };
}
