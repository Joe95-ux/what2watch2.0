import { getPickForTonightBucket } from "@/lib/pick-for-tonight/bucket";
import { discoverMovies, discoverTV, getTrendingMovies, getTrendingTV } from "@/lib/tmdb";
import { hasReliableVoteCount, MIN_RATING_VOTE_COUNT } from "@/lib/rating-quality";
import type { PickMedia } from "@/lib/pick-for-tonight/media";
import { candidateId, normMedia } from "@/lib/pick-for-tonight/media";
import type { LightCandidate, PickReasonCode } from "@/lib/pick-for-tonight/internal-types";

/** TMDB discover page only — rotates with 6h bucket. */
export function discoveryPageSeed(userId: string): number {
  const bucketPart = getPickForTonightBucket().split("-").pop() ?? "0";
  const sixHourBucket = Number.parseInt(bucketPart, 10) || 0;
  let hash = sixHourBucket;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 97;
  }
  return 1 + (hash % 5);
}

export function isDateReleased(date: string | null | undefined): boolean {
  if (!date) return false;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return candidate.getTime() <= today.getTime();
}

export function recencyBoost(createdAt: Date | null | undefined, now = new Date()): number {
  if (!createdAt) return 0;
  const ageDays = Math.max(0, (now.getTime() - createdAt.getTime()) / 86400000);
  if (ageDays <= 3) return 3;
  if (ageDays <= 14) return 2;
  if (ageDays <= 45) return 1;
  return 0;
}

const STRETCH_GENRE_MAP: Record<number, number> = {
  35: 53,
  53: 18,
  18: 35,
  27: 35,
  10749: 18,
  878: 18,
};

function pickStretchGenre(favoriteGenres: number[]): number | null {
  const primary = favoriteGenres.filter((g) => Number.isFinite(g))[0];
  if (primary == null) return 53;
  return STRETCH_GENRE_MAP[primary] ?? 18;
}

type UpsertLight = (
  map: Map<string, LightCandidate>,
  item: {
    tmdbId: number;
    mediaType: PickMedia;
    title: string;
    posterPath: string | null;
    slot: LightCandidate["slot"];
    reason: PickReasonCode;
    score: number;
  },
  excluded: Set<string>
) => void;

function makeUpsertLight(): UpsertLight {
  return (map, item, excluded) => {
    const id = candidateId(item.tmdbId, item.mediaType);
    if (excluded.has(id)) return;
    const hints =
      item.reason.code === "trending"
        ? ["Trending today"]
        : item.reason.code === "discovery"
          ? ["Matches your taste"]
          : item.reason.code === "stretch"
            ? ["Stretch pick"]
            : item.reason.code === "watchlist"
              ? ["Watchlist"]
              : item.reason.code === "list"
                ? [`List: ${item.reason.name}`]
                : item.reason.code === "playlist"
                  ? [`Playlist: ${item.reason.name}`]
                  : item.reason.code === "chat"
                    ? ["Recent title chat"]
                    : item.reason.code === "note"
                      ? ["Has personal note"]
                      : [];

    const prev = map.get(id);
    if (!prev) {
      map.set(id, {
        id,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        posterPath: item.posterPath,
        slot: item.slot,
        score: item.score,
        reasons: [item.reason],
        hints,
      });
      return;
    }
    prev.score += item.score;
    if (!prev.reasons.some((r) => r.code === item.reason.code)) {
      prev.reasons.push(item.reason);
    }
    for (const h of hints) {
      if (!prev.hints.includes(h)) prev.hints.push(h);
    }
  };
}

export async function addDiscoveryCandidates(
  map: Map<string, LightCandidate>,
  opts: {
    userId: string;
    favoriteGenres: number[];
    preferredTypes: PickMedia[];
    excluded: Set<string>;
  }
) {
  const upsert = makeUpsertLight();
  const genres = opts.favoriteGenres.filter((g) => Number.isFinite(g)).slice(0, 4);
  if (genres.length === 0) return;

  const page = discoveryPageSeed(opts.userId);

  const addFromResults = (
    items: Array<{
      id: number;
      title?: string;
      name?: string;
      poster_path?: string | null;
      vote_count?: number;
    }>,
    mediaType: PickMedia,
    startWeight: number,
    slot: "discovery" | "stretch",
    reasonCode: "discovery" | "stretch"
  ) => {
    items.filter((item) => hasReliableVoteCount(item.vote_count)).forEach((item, index) => {
      const title = item.title ?? item.name ?? "Unknown";
      upsert(
        map,
        {
          tmdbId: item.id,
          mediaType,
          title,
          posterPath: item.poster_path ?? null,
          slot,
          reason: { code: reasonCode, weight: startWeight - index },
          score: startWeight - index,
        },
        opts.excluded
      );
    });
  };

  try {
    if (opts.preferredTypes.includes("movie")) {
      const movies = await discoverMovies({
        genre: genres,
        sortBy: "popularity.desc",
        minRating: 6.8,
        minVoteCount: MIN_RATING_VOTE_COUNT,
        page,
      });
      addFromResults((movies.results ?? []).slice(0, 12), "movie", 16, "discovery", "discovery");
    }
    if (opts.preferredTypes.includes("tv")) {
      const tv = await discoverTV({
        genre: genres,
        sortBy: "popularity.desc",
        minRating: 6.8,
        minVoteCount: MIN_RATING_VOTE_COUNT,
        page,
      });
      addFromResults((tv.results ?? []).slice(0, 12), "tv", 16, "discovery", "discovery");
    }

    const stretchGenre = pickStretchGenre(genres);
    if (stretchGenre != null) {
      const stretchPage = page + 1 > 5 ? 1 : page + 1;
      if (opts.preferredTypes.includes("movie")) {
        const stretch = await discoverMovies({
          genre: [stretchGenre],
          sortBy: "vote_average.desc",
          minRating: 7,
          minVoteCount: MIN_RATING_VOTE_COUNT,
          page: stretchPage,
        });
        addFromResults((stretch.results ?? []).slice(0, 6), "movie", 12, "stretch", "stretch");
      }
      if (opts.preferredTypes.includes("tv")) {
        const stretchTv = await discoverTV({
          genre: [stretchGenre],
          sortBy: "vote_average.desc",
          minRating: 7,
          minVoteCount: MIN_RATING_VOTE_COUNT,
          page: stretchPage,
        });
        addFromResults((stretchTv.results ?? []).slice(0, 6), "tv", 12, "stretch", "stretch");
      }
    }
  } catch (error) {
    console.error("pick-for-tonight discovery fetch failed:", error);
  }
}

export async function addTrendingCandidates(
  map: Map<string, LightCandidate>,
  opts: { preferredTypes: PickMedia[]; excluded: Set<string> }
) {
  const upsert = makeUpsertLight();
  const [trendingMovies, trendingTv] = await Promise.all([
    getTrendingMovies("day", 1),
    opts.preferredTypes.includes("tv") ? getTrendingTV("day", 1) : Promise.resolve({ results: [] }),
  ]);

  const releasedMovies = (trendingMovies.results ?? []).filter((m) => isDateReleased(m.release_date));
  for (const [index, movie] of releasedMovies.slice(0, 6).entries()) {
    upsert(
      map,
      {
        tmdbId: movie.id,
        mediaType: "movie",
        title: movie.title,
        posterPath: movie.poster_path ?? null,
        slot: "trending",
        reason: { code: "trending", weight: 100 - index },
        score: 100 - index,
      },
      opts.excluded
    );
  }

  const releasedTv = (trendingTv.results ?? []).filter((s) => isDateReleased(s.first_air_date));
  for (const [index, show] of releasedTv.slice(0, 6).entries()) {
    upsert(
      map,
      {
        tmdbId: show.id,
        mediaType: "tv",
        title: show.name,
        posterPath: show.poster_path ?? null,
        slot: "trending",
        reason: { code: "trending", weight: 96 - index },
        score: 96 - index,
      },
      opts.excluded
    );
  }
}

export function upsertLibraryCandidate(
  map: Map<string, LightCandidate>,
  item: {
    tmdbId: number;
    mediaType: string;
    title: string;
    posterPath: string | null;
    reason: PickReasonCode;
    score: number;
    extraHint?: string;
  },
  excluded: Set<string>
) {
  const upsert = makeUpsertLight();
  upsert(
    map,
    {
      tmdbId: item.tmdbId,
      mediaType: normMedia(item.mediaType),
      title: item.title,
      posterPath: item.posterPath,
      slot: "library",
      reason: item.reason,
      score: item.score,
    },
    excluded
  );
  if (item.extraHint) {
    const id = candidateId(item.tmdbId, item.mediaType);
    const prev = map.get(id);
    if (prev && !prev.hints.includes(item.extraHint)) {
      prev.hints.push(item.extraHint);
      prev.reasons.push({ code: "note", weight: 6 });
    }
  }
}
