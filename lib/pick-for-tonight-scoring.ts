import type { PickForTonightCandidate } from "@/lib/pick-for-tonight-types";

export type RerankMode = "lighter" | "shorter" | "intense" | "different" | "thoughtful";

const GRIPPING_GENRES = new Set([
  "thriller",
  "horror",
  "crime",
  "mystery",
  "war",
  "action",
  "adventure",
]);

const FEEL_GOOD_GENRES = new Set([
  "comedy",
  "romance",
  "family",
  "animation",
  "music",
  "musical",
  "fantasy",
]);

const THOUGHTFUL_GENRES = new Set([
  "drama",
  "documentary",
  "history",
  "biography",
  "science fiction",
  "sci-fi",
  "war",
  "mystery",
]);

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

function normalizedGenres(pick: PickForTonightCandidate): string[] {
  return (pick.genreNames ?? []).map((g) => g.trim().toLowerCase()).filter(Boolean);
}

function genreAffinity(genres: string[], preferred: Set<string>, penalized: Set<string>): number {
  let score = 0;
  for (const g of genres) {
    if (preferred.has(g)) score += 14;
    if (penalized.has(g)) score -= 18;
  }
  return score;
}

function moodGenreBoost(pick: PickForTonightCandidate, mode: RerankMode): number {
  const genres = normalizedGenres(pick);
  if (genres.length === 0) return 0;

  switch (mode) {
    case "intense":
      return genreAffinity(genres, GRIPPING_GENRES, FEEL_GOOD_GENRES);
    case "lighter":
      return genreAffinity(genres, FEEL_GOOD_GENRES, GRIPPING_GENRES);
    case "thoughtful":
      return (
        genreAffinity(genres, THOUGHTFUL_GENRES, new Set(["comedy"])) +
        (pick.overview && pick.overview.length > 120 ? 4 : 0) +
        ((pick.imdbRating ?? 0) >= 7.5 ? 6 : 0)
      );
    case "different":
      return 0;
    default:
      return 0;
  }
}

function leadGenre(pick: PickForTonightCandidate): string {
  return normalizedGenres(pick)[0] ?? "";
}

function ensurePrimaryChanges(
  picks: PickForTonightCandidate[],
  previousTmdbId: number | undefined
): PickForTonightCandidate[] {
  if (!previousTmdbId || picks.length <= 1 || picks[0].tmdbId !== previousTmdbId) return picks;
  const prevLead = leadGenre(picks[0]);
  const alt =
    picks.find((p) => p.tmdbId !== previousTmdbId && leadGenre(p) !== prevLead) ??
    picks.find((p) => p.tmdbId !== previousTmdbId);
  if (!alt) return picks;
  return [alt, ...picks.filter((p) => p.tmdbId !== alt.tmdbId)];
}

export function rerankPicks(
  picks: PickForTonightCandidate[],
  mode: RerankMode | null,
  opts?: { avoidLeadGenre?: string | null }
): Array<{ pick: PickForTonightCandidate; score: number }> {
  const avoidGenre = opts?.avoidLeadGenre?.trim().toLowerCase() ?? "";

  const score = (p: PickForTonightCandidate): number => {
    const runtime = parseRuntimeToMinutes(p.runtimeText) ?? 120;
    const mature = isMatureRating(p.rated);
    const watchCommitmentMinutes =
      p.mediaType === "tv" ? Math.round(runtime * 2.2 + 20) : runtime;
    const isDiscovery = p.hints.some((h) => h.startsWith("Matches your taste"));
    const discoveryBoost = isDiscovery ? 8 : 0;
    const libraryBoost = p.hints.some((h) => h === "Watchlist" || h.startsWith("List:") || h.startsWith("Playlist:"))
      ? 3
      : 0;

    const base =
      p.matchPercent * 0.55 +
      discoveryBoost +
      libraryBoost +
      (p.imdbRating ?? 0) * 0.35 +
      (p.justwatchRank24h ? Math.max(0, 10 - p.justwatchRank24h * 0.35) : 0);

    if (!mode) return base;

    let moodScore = base + moodGenreBoost(p, mode);

    switch (mode) {
      case "shorter":
        moodScore += (140 - watchCommitmentMinutes) * 0.55;
        break;
      case "lighter":
        moodScore += (mature ? -16 : 14) - watchCommitmentMinutes * 0.08;
        break;
      case "intense":
        moodScore += (mature ? 16 : 4) + watchCommitmentMinutes * 0.06;
        break;
      case "thoughtful":
        moodScore += mature ? 4 : 0;
        moodScore -= watchCommitmentMinutes * 0.04;
        break;
      case "different": {
        const g = leadGenre(p);
        if (avoidGenre && g === avoidGenre) moodScore -= 28;
        else if (avoidGenre && g) moodScore += 10;
        moodScore -= watchCommitmentMinutes * 0.03;
        break;
      }
      default:
        break;
    }

    return moodScore;
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
      const lead = leadGenre(current.pick);
      const genrePenalty = lead ? (genreSeen.get(lead) ?? 0) * 12 : 0;
      const mediaPenalty = (mediaSeen.get(current.pick.mediaType) ?? 0) * 5;
      const adjusted = current.score - genrePenalty - mediaPenalty;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = i;
      }
    }

    const chosen = pool.splice(bestIndex, 1)[0];
    selected.push(chosen);
    const g = leadGenre(chosen.pick);
    if (g) genreSeen.set(g, (genreSeen.get(g) ?? 0) + 1);
    mediaSeen.set(chosen.pick.mediaType, (mediaSeen.get(chosen.pick.mediaType) ?? 0) + 1);
  }

  return selected;
}

/** Reorder a pre-enriched pool locally (mood chips) without hitting the API. */
export function applyPickPoolRerank(
  pool: PickForTonightCandidate[],
  mode: RerankMode | null,
  opts?: {
    avoidTmdbId?: number;
    avoidLeadGenre?: string | null;
    previousTmdbId?: number;
    limit?: number;
  }
): PickForTonightCandidate[] {
  const limit = opts?.limit ?? 6;
  let candidates = pool;
  if (opts?.avoidTmdbId != null) {
    candidates = candidates.filter((p) => p.tmdbId !== opts.avoidTmdbId);
  }
  if (candidates.length === 0) return [];

  const ranked = rerankPicks(candidates, mode, { avoidLeadGenre: opts?.avoidLeadGenre });
  const selected = selectDiversePicks(ranked, limit).map(({ pick }) => pick);
  return ensurePrimaryChanges(selected, opts?.previousTmdbId);
}
