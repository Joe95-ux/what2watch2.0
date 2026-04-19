export type PickForTonightMedia = "movie" | "tv";

export type PickForTonightCandidate = {
  id: string;
  tmdbId: number;
  mediaType: PickForTonightMedia;
  title: string;
  posterPath: string | null;
  hints: string[];
};

export type PickForTonightPick = PickForTonightCandidate & {
  reason: string;
  sources: string[];
};

export type PickForTonightResponse =
  | {
      insufficientContext: true;
      message: string;
      questionCount: number;
      maxQuestions: number;
      usedAi: false;
    }
  | {
      picks: {
        primary: PickForTonightPick;
        alternates: PickForTonightPick[];
      };
      questionCount: number;
      maxQuestions: number;
      usedAi: boolean;
    };
