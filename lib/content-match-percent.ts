/** Shared 55–98 match % scale for watching cards and Pick for Tonight. */

export function clampMatchPercent(value: number): number {
  return Math.max(55, Math.min(98, Math.round(value)));
}

export type ContentMatchInput = {
  genreIds: number[];
  mediaType: "movie" | "tv";
  favoriteGenres: number[];
  dislikedGenres: number[];
  preferredTypes: ("movie" | "tv")[];
  voteAverage?: number | null;
  inWatchlist?: boolean;
  /** Used by watching-room scores (continuity), not pick-for-tonight. */
  watchedBefore?: boolean;
  watchingCount?: number;
  thoughtCount?: number;
  tvPreferenceRatio?: number;
};

/**
 * Taste fit from genres, preferred type, ratings, and light social signals.
 * Watching rooms pass social fields; pick-for-tonight omits watchedBefore boost.
 */
export function calculateContentMatchPercent(input: ContentMatchInput): number {
  const {
    genreIds,
    mediaType,
    favoriteGenres,
    dislikedGenres,
    preferredTypes,
    voteAverage,
    inWatchlist = false,
    watchedBefore = false,
    watchingCount = 0,
    thoughtCount = 0,
    tvPreferenceRatio = 0.5,
  } = input;

  let score = 60;

  if (favoriteGenres.length > 0 && genreIds.length > 0) {
    const overlap = genreIds.filter((id) => favoriteGenres.includes(id)).length;
    score += Math.min(24, overlap * 10);
  }

  if (dislikedGenres.length > 0 && genreIds.length > 0) {
    const badOverlap = genreIds.filter((id) => dislikedGenres.includes(id)).length;
    score -= badOverlap * 16;
  }

  if (preferredTypes.length > 0) {
    score += preferredTypes.includes(mediaType) ? 5 : -12;
  }

  if (voteAverage != null && voteAverage > 0) {
    score += Math.min(10, Math.max(0, (voteAverage - 5.5) * 2.2));
  }

  if (inWatchlist) score += 8;
  if (watchedBefore) score += 6;
  score += Math.min(8, watchingCount * 2);
  score += Math.min(4, thoughtCount);
  if (mediaType === "tv") score += Math.round(tvPreferenceRatio * 6);

  return clampMatchPercent(score);
}
