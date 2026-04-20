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
  imdbRating: number | null;
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
