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
  /** Short narrative explaining why this title surfaced tonight. */
  whyTonight: string;
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
    };
