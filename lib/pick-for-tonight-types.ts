export type PickForTonightMedia = "movie" | "tv";

export type PickForTonightProvider = {
  providerName: string;
  iconUrl: string | null;
  monetizationType: "flatrate" | "rent" | "buy" | "ads" | "free" | "cinema" | "other";
  standardWebUrl: string | null;
  deepLinkUrl: string | null;
};

export type PickForTonightCandidate = {
  id: string;
  tmdbId: number;
  mediaType: PickForTonightMedia;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  releaseYear: string | null;
  rated: string | null;
  runtimeText: string | null;
  overview: string | null;
  /** TMDB genre names (first is used for “why tonight” flavor). */
  genreNames: string[];
  genreIds: number[];
  /** Short narrative explaining why this title surfaced tonight. */
  whyTonight: string;
  /** Relative mood-aware relevance score for UI display. */
  matchPercent: number;
  imdbRating: number | null;
  justwatchRank24h: number | null;
  justwatchRankDelta24h: number | null;
  justwatchRankUrl: string | null;
  isTrendingTodayPick: boolean;
  provider: PickForTonightProvider | null;
  hints: string[];
};

export type PickForTonightResponse =
  | {
      insufficientContext: true;
      message: string;
    }
  | {
      picks: PickForTonightCandidate[];
      /** Enriched candidates for client-side mood reranking (no extra API round-trip). */
      pool: PickForTonightCandidate[];
    };
