/** Minimum vote count required before we trust/display a rating. */
export const MIN_RATING_VOTE_COUNT = 2000;

export type RatingSource = "imdb" | "tmdb";

export type ResolvedDisplayRating = {
  rating: number;
  source: RatingSource;
  votes: number;
};

export function hasReliableVoteCount(votes: number | null | undefined): boolean {
  return typeof votes === "number" && Number.isFinite(votes) && votes >= MIN_RATING_VOTE_COUNT;
}

/** Returns rating only when vote count meets the reliability threshold. */
export function sanitizeRatingValue(
  rating: number | null | undefined,
  votes: number | null | undefined
): number | null {
  if (rating == null || !Number.isFinite(rating) || rating <= 0) return null;
  if (!hasReliableVoteCount(votes)) return null;
  return rating;
}

/** Prefer IMDb when reliable; otherwise TMDB when reliable. */
export function resolveDisplayRating(opts: {
  imdbRating?: number | null;
  imdbVotes?: number | null;
  tmdbRating?: number | null;
  tmdbVoteCount?: number | null;
}): ResolvedDisplayRating | null {
  const imdb = sanitizeRatingValue(opts.imdbRating, opts.imdbVotes);
  if (imdb != null && opts.imdbVotes != null) {
    return { rating: imdb, source: "imdb", votes: opts.imdbVotes };
  }

  const tmdb = sanitizeRatingValue(opts.tmdbRating, opts.tmdbVoteCount);
  if (tmdb != null && opts.tmdbVoteCount != null) {
    return { rating: tmdb, source: "tmdb", votes: opts.tmdbVoteCount };
  }

  return null;
}
