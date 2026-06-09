import type { PickMedia } from "@/lib/pick-for-tonight/media";
import type { PickForTonightCandidate } from "@/lib/pick-for-tonight-types";

export type RerankMode = "lighter" | "shorter" | "intense" | "different" | "thoughtful";

export type PickSlot = "library" | "discovery" | "trending" | "stretch";

export type PickReasonCode =
  | { code: "trending"; weight: number }
  | { code: "discovery"; weight: number; genre?: string }
  | { code: "stretch"; weight: number; genre?: string }
  | { code: "watchlist"; weight: number; days?: number }
  | { code: "list"; weight: number; name: string }
  | { code: "playlist"; weight: number; name: string }
  | { code: "chat"; weight: number }
  | { code: "note"; weight: number }
  | { code: "taste"; weight: number; genre?: string };

export type PickTonightAnchor = {
  watchlistedAt: Date | null;
  listAnchoredAt: Date | null;
  listNames: string[];
  playlistAnchoredAt: Date | null;
  playlistNames: string[];
};

export const EMPTY_PICK_TONIGHT_ANCHOR: PickTonightAnchor = {
  watchlistedAt: null,
  listAnchoredAt: null,
  listNames: [],
  playlistAnchoredAt: null,
  playlistNames: [],
};

/** Layer A — light candidate before TMDB enrich. */
export type LightCandidate = {
  id: string;
  tmdbId: number;
  mediaType: PickMedia;
  title: string;
  posterPath: string | null;
  slot: PickSlot;
  score: number;
  reasons: PickReasonCode[];
  /** Legacy hint strings for UI chips / match heuristics. */
  hints: string[];
};

export type UserPickContext = {
  userId: string;
  favoriteGenres: number[];
  dislikedGenres: number[];
  preferredTypes: PickMedia[];
};

export type BuildPickInput = {
  onlyUnseen: boolean;
  trendingToday: boolean;
  rerankMode: RerankMode | null;
  avoidTmdbId: number | null;
  avoidLeadGenre: string | null;
  writeCooldownLog: boolean;
};

export type PickForTonightApiResult =
  | { picks: PickForTonightCandidate[]; pool: PickForTonightCandidate[] }
  | { insufficientContext: true; message: string };
