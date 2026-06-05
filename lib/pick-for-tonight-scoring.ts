import type { PickForTonightCandidate } from "@/lib/pick-for-tonight-types";

export type RerankMode = "lighter" | "shorter" | "intense" | "different";

function parseRuntimeToMinutes(runtimeText: string | null | undefined): number | null {
  if (!runtimeText) return null;
  const hMatch = runtimeText.match(/(\d+)\s*h/i);
  const mMatch = runtimeText.match(/(\d+)\s*m/i);
  const h = hMatch ? Number.parseInt(hMatch[1], 10) : 0;
  const m = mMatch ? Number.parseInt(mMatch[1], 10) : 0;
  const total = h * 60 + m;
  return Number.isFinite(total) && total > 0 ? total : null;
}

function isMatureRating(rated: string | null | undefined): boolean {
  if (!rated) return false;
  const r = rated.toUpperCase();
  return r.includes("R") || r.includes("NC-17") || r.includes("TV-MA");
}

export function rerankPicks(
  picks: PickForTonightCandidate[],
  mode: RerankMode | null
): Array<{ pick: PickForTonightCandidate; score: number }> {
  const score = (p: PickForTonightCandidate): number => {
    const runtime = parseRuntimeToMinutes(p.runtimeText) ?? 120;
    const mature = isMatureRating(p.rated);
    const watchCommitmentMinutes =
      p.mediaType === "tv" ? Math.round(runtime * 2.2 + 20) : runtime;
    const discoveryBoost = p.hints.some((h) => h.startsWith("Matches your taste")) ? 6 : 0;
    const base =
      p.matchPercent +
      discoveryBoost +
      (p.imdbRating ?? 0) * 0.4 +
      (p.justwatchRank24h ? Math.max(0, 12 - p.justwatchRank24h * 0.4) : 0);

    if (!mode) return base;
    switch (mode) {
      case "shorter":
        return base + (140 - watchCommitmentMinutes) * 0.35;
      case "lighter":
        return base + (mature ? -12 : 12) - watchCommitmentMinutes * 0.06;
      case "intense":
        return base + (mature ? 14 : 0) + watchCommitmentMinutes * 0.05;
      case "different":
        return base + (mature ? 2 : 0) - watchCommitmentMinutes * 0.02;
      default:
        return base;
    }
  };

  return [...picks]
    .map((pick) => ({ pick, score: score(pick) }))
    .sort((a, b) => b.score - a.score || a.pick.title.localeCompare(b.pick.title));
}

export function selectDiversePicks(
  ranked: Array<{ pick: PickForTonightCandidate; score: number }>,
  limit: number
): Array<{ pick: PickForTonightCandidate; score: number }> {
  const pool = [...ranked];
  const selected: Array<{ pick: PickForTonightCandidate; score: number }> = [];
  const genreSeen = new Map<string, number>();
  const mediaSeen = new Map<string, number>();

  while (selected.length < limit && pool.length > 0) {
    let bestIndex = 0;
    let bestAdjusted = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < pool.length; i += 1) {
      const current = pool[i];
      const leadGenre = current.pick.genreNames?.[0]?.toLowerCase() ?? "";
      const genrePenalty = leadGenre ? (genreSeen.get(leadGenre) ?? 0) * 8 : 0;
      const mediaPenalty = (mediaSeen.get(current.pick.mediaType) ?? 0) * 4;
      const adjusted = current.score - genrePenalty - mediaPenalty;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = i;
      }
    }

    const chosen = pool.splice(bestIndex, 1)[0];
    selected.push(chosen);
    const g = chosen.pick.genreNames?.[0]?.toLowerCase();
    if (g) genreSeen.set(g, (genreSeen.get(g) ?? 0) + 1);
    mediaSeen.set(chosen.pick.mediaType, (mediaSeen.get(chosen.pick.mediaType) ?? 0) + 1);
  }

  return selected;
}

/** Reorder a pre-enriched pool locally (mood chips) without hitting the API. */
export function applyPickPoolRerank(
  pool: PickForTonightCandidate[],
  mode: RerankMode | null,
  opts?: { avoidTmdbId?: number; limit?: number }
): PickForTonightCandidate[] {
  const limit = opts?.limit ?? 6;
  let candidates = pool;
  if (opts?.avoidTmdbId != null) {
    candidates = candidates.filter((p) => p.tmdbId !== opts.avoidTmdbId);
  }
  if (candidates.length === 0) return [];
  return selectDiversePicks(rerankPicks(candidates, mode), limit).map(({ pick }) => pick);
}
