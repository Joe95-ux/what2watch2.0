import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  getPickForTonightBucket,
  PICK_FOR_TONIGHT_CACHE_SECONDS,
} from "@/lib/pick-for-tonight-bucket";
import {
  getMovieDetails,
  getTVDetails,
  getTrendingMovies,
  getTrendingTV,
  discoverMovies,
  discoverTV,
} from "@/lib/tmdb";
import { calculateContentMatchPercent } from "@/lib/content-match-percent";
import {
  rerankPicks,
  selectDiversePicks,
  type RerankMode,
} from "@/lib/pick-for-tonight-scoring";
import { getOMDBFullData } from "@/lib/omdb";
import { getJustWatchAvailability } from "@/lib/justwatch";
import type { PickForTonightCandidate } from "@/lib/pick-for-tonight-types";
import {
  EMPTY_PICK_TONIGHT_ANCHOR,
  buildWhyTonight,
  mergeListTouch,
  mergePlaylistTouch,
  mergeWatchlistTouch,
  type PickTonightAnchor,
} from "@/lib/pick-for-tonight-why-tonight";

const ENRICH_LIMIT = 16;
const POOL_LIMIT = 12;
const PICK_LIMIT = 6;

type Media = "movie" | "tv";

function normMedia(m: string): Media {
  return m === "tv" ? "tv" : "movie";
}

function candidateId(tmdbId: number, mediaType: string): string {
  return `${normMedia(mediaType)}:${tmdbId}`;
}

function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function yearFromDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return String(d.getFullYear());
}

function isDateReleased(date: string | null | undefined): boolean {
  if (!date) return false;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  // Compare by local date to avoid edge-case timezone drift around midnight.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return candidate.getTime() <= today.getTime();
}

function recencyBoost(createdAt: Date | null | undefined, now = new Date()): number {
  if (!createdAt) return 0;
  const ageDays = Math.max(0, (now.getTime() - createdAt.getTime()) / 86400000);
  if (ageDays <= 3) return 3;
  if (ageDays <= 14) return 2;
  if (ageDays <= 45) return 1;
  return 0;
}

/** TMDB discover page only — no DB reads; rotates with 6h bucket. */
function discoveryPageSeed(userId: string): number {
  const bucketPart = getPickForTonightBucket().split("-").pop() ?? "0";
  const sixHourBucket = Number.parseInt(bucketPart, 10) || 0;
  let hash = sixHourBucket;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 97;
  }
  return 1 + (hash % 5);
}

async function addDiscoveryCandidates(
  map: Map<string, BaseCandidate>,
  opts: {
    userId: string;
    favoriteGenres: number[];
    preferredTypes: Media[];
    excluded: Set<string>;
  }
) {
  const genres = opts.favoriteGenres.filter((g) => Number.isFinite(g)).slice(0, 4);
  if (genres.length === 0) return;

  const page = discoveryPageSeed(opts.userId);

  const addFromResults = (
    items: Array<{ id: number; title?: string; name?: string; poster_path?: string | null }>,
    mediaType: Media,
    startWeight: number
  ) => {
    items.forEach((item, index) => {
      const title = item.title ?? item.name ?? "Unknown";
      const base = {
        id: candidateId(item.id, mediaType),
        tmdbId: item.id,
        mediaType,
        title,
        posterPath: item.poster_path ?? null,
      };
      if (opts.excluded.has(base.id)) return;
      addHint(map, base, "Matches your taste", startWeight - index);
    });
  };

  try {
    if (opts.preferredTypes.includes("movie")) {
      const movies = await discoverMovies({
        genre: genres,
        sortBy: "popularity.desc",
        minRating: 6.8,
        page,
      });
      addFromResults((movies.results ?? []).slice(0, 10), "movie", 16);
    }
    if (opts.preferredTypes.includes("tv")) {
      const tv = await discoverTV({
        genre: genres,
        sortBy: "popularity.desc",
        minRating: 6.8,
        page,
      });
      addFromResults((tv.results ?? []).slice(0, 10), "tv", 16);
    }
  } catch (error) {
    console.error("pick-for-tonight discovery fetch failed:", error);
  }
}

type BaseCandidate = {
  id: string;
  tmdbId: number;
  mediaType: Media;
  title: string;
  posterPath: string | null;
  hints: string[];
  score: number;
};

function addHint(
  map: Map<string, BaseCandidate>,
  base: Omit<BaseCandidate, "hints" | "score">,
  hint: string,
  weight: number
) {
  const prev = map.get(base.id);
  if (!prev) {
    map.set(base.id, { ...base, hints: [hint], score: weight });
    return;
  }
  if (!prev.hints.includes(hint)) prev.hints.push(hint);
  prev.score += weight;
}

async function enrichCandidate(c: BaseCandidate): Promise<PickForTonightCandidate> {
  try {
    const details = c.mediaType === "movie" ? await getMovieDetails(c.tmdbId) : await getTVDetails(c.tmdbId);
    const imdbId = details.external_ids?.imdb_id ?? null;
    const [omdb, availability] = await Promise.all([
      imdbId ? getOMDBFullData(imdbId) : Promise.resolve(null),
      getJustWatchAvailability(c.mediaType, c.tmdbId, "US"),
    ]);
    const runtimeMinutes =
      c.mediaType === "movie"
        ? (details as { runtime?: number }).runtime ?? null
        : (details as { episode_run_time?: number[] }).episode_run_time?.[0] ?? null;
    const primaryProvider =
      availability?.offersByType?.flatrate?.[0] ??
      availability?.offersByType?.buy?.[0] ??
      availability?.offersByType?.rent?.[0] ??
      availability?.allOffers?.[0] ??
      null;

    const genres = (details as { genres?: { id?: number; name?: string }[] }).genres ?? [];
    const genreIds = genres
      .map((g) => g.id)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
    const genreNames = genres
      .map((g) => g.name?.trim())
      .filter((x): x is string => Boolean(x));

    return {
      ...c,
      genreNames,
      genreIds,
      whyTonight: "",
      matchPercent: 0,
      backdropPath: details.backdrop_path ?? null,
      releaseDate: c.mediaType === "movie" ? (details as { release_date?: string }).release_date ?? null : null,
      firstAirDate: c.mediaType === "tv" ? (details as { first_air_date?: string }).first_air_date ?? null : null,
      releaseYear:
        c.mediaType === "movie"
          ? yearFromDate((details as { release_date?: string }).release_date ?? null)
          : yearFromDate((details as { first_air_date?: string }).first_air_date ?? null),
      rated: omdb?.rated ?? null,
      runtimeText: formatRuntime(runtimeMinutes),
      overview: details.overview ?? null,
      imdbRating: omdb?.imdbRating ?? (details.vote_average > 0 ? Number(details.vote_average.toFixed(1)) : null),
      justwatchRank24h: availability?.ranks?.["1d"]?.rank ?? null,
      justwatchRankDelta24h: availability?.ranks?.["1d"]?.delta ?? null,
      justwatchRankUrl: availability?.fullPath ? `https://www.justwatch.com${availability.fullPath}` : null,
      isTrendingTodayPick: c.hints.includes("Trending today"),
      provider: primaryProvider
        ? {
            providerName: primaryProvider.providerName,
            iconUrl: primaryProvider.iconUrl ?? null,
            monetizationType: primaryProvider.monetizationType,
            standardWebUrl: primaryProvider.standardWebUrl ?? null,
            deepLinkUrl: primaryProvider.deepLinkUrl ?? null,
          }
        : null,
      hints: c.hints,
    };
  } catch {
    return {
      ...c,
      genreNames: [],
      genreIds: [],
      whyTonight: "",
      matchPercent: 0,
      backdropPath: null,
      releaseDate: null,
      firstAirDate: null,
      releaseYear: null,
      rated: null,
      runtimeText: null,
      overview: null,
      imdbRating: null,
      justwatchRank24h: null,
      justwatchRankDelta24h: null,
      justwatchRankUrl: null,
      isTrendingTodayPick: c.hints.includes("Trending today"),
      provider: null,
      hints: c.hints,
    };
  }
}

export type PickForTonightApiResult =
  | { picks: PickForTonightCandidate[]; pool: PickForTonightCandidate[] }
  | { insufficientContext: true; message: string };

type BuildPickInput = {
  onlyUnseen: boolean;
  trendingToday: boolean;
  rerankMode: RerankMode | null;
  avoidTmdbId: number | null;
  avoidLeadGenre: string | null;
  writeCooldownLog: boolean;
};

async function buildPickForTonightResult(
  userId: string,
  input: BuildPickInput
): Promise<PickForTonightApiResult> {
  const { onlyUnseen, trendingToday, rerankMode, avoidTmdbId, avoidLeadGenre, writeCooldownLog } = input;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      preferences: {
        select: {
          favoriteGenres: true,
          dislikedGenres: true,
          preferredTypes: true,
        },
      },
    },
  });
  if (!user) {
    return { insufficientContext: true, message: "User not found." };
  }

  const favoriteGenres = user.preferences?.favoriteGenres ?? [];
  const dislikedGenres = user.preferences?.dislikedGenres ?? [];
  const preferredTypes = (user.preferences?.preferredTypes ?? ["movie", "tv"]).filter(
    (t): t is Media => t === "movie" || t === "tv"
  );
  const effectivePreferredTypes: Media[] =
    preferredTypes.length > 0 ? preferredTypes : (["movie", "tv"] as Media[]);

  const anchorById = new Map<string, PickTonightAnchor>();
  const cooldownSince = new Date(Date.now() - 1000 * 60 * 60 * 72);

  const [lists, playlists, watchlist, sessions, recentPickEvents, dislikes, watchedTitles, viewingLogs, lowRatedReviews] =
    await Promise.all([
      db.list.findMany({
        where: { userId: user.id },
        select: {
          name: true,
          items: {
            select: {
              tmdbId: true,
              mediaType: true,
              title: true,
              note: true,
              posterPath: true,
              createdAt: true,
            },
          },
        },
      }),
      db.playlist.findMany({
        where: { userId: user.id },
        select: {
          name: true,
          items: {
            select: {
              tmdbId: true,
              mediaType: true,
              title: true,
              note: true,
              posterPath: true,
              createdAt: true,
            },
          },
        },
      }),
      db.watchlistItem.findMany({
        where: { userId: user.id },
        select: {
          tmdbId: true,
          mediaType: true,
          title: true,
          note: true,
          posterPath: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      db.aiChatSession.findMany({
        where: { userId: user.id, mode: "movie-details" },
        orderBy: { updatedAt: "desc" },
        take: 16,
        select: { metadata: true, updatedAt: true },
      }),
      db.aiChatEvent.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: cooldownSince },
          sessionId: { startsWith: `pick-tonight:${user.id}` },
        },
        orderBy: { createdAt: "desc" },
        take: 24,
        select: { resultIds: true, resultTypes: true },
      }),
      db.contentReaction.findMany({
        where: { userId: user.id, reactionType: "dislike" },
        select: { tmdbId: true, mediaType: true },
      }),
      db.watchedTitle.findMany({
        where: { userId: user.id },
        select: { tmdbId: true, mediaType: true },
        take: 4000,
      }),
      db.viewingLog.findMany({
        where: { userId: user.id },
        select: { tmdbId: true, mediaType: true },
        take: 4000,
      }),
      db.review.findMany({
        where: { userId: user.id, rating: { lte: 4 } },
        select: { tmdbId: true, mediaType: true },
        take: 500,
      }),
    ]);

  const excluded = new Set<string>();
  const addExcluded = (tmdbId: number, mediaType: string) => {
    excluded.add(candidateId(tmdbId, mediaType));
  };
  for (const event of recentPickEvents) {
    for (let i = 0; i < event.resultIds.length; i += 1) {
      addExcluded(event.resultIds[i], event.resultTypes[i] ?? "movie");
    }
  }
  for (const row of dislikes) addExcluded(row.tmdbId, row.mediaType);
  for (const row of lowRatedReviews) addExcluded(row.tmdbId, row.mediaType);
  if (onlyUnseen) {
    for (const row of watchedTitles) addExcluded(row.tmdbId, row.mediaType);
    for (const row of viewingLogs) addExcluded(row.tmdbId, row.mediaType);
  }

  const byId = new Map<string, BaseCandidate>();
  if (trendingToday) {
    const [trendingMovies, trendingTv] = await Promise.all([
      getTrendingMovies("day", 1),
      effectivePreferredTypes.includes("tv") ? getTrendingTV("day", 1) : Promise.resolve({ results: [] }),
    ]);
    const releasedMovies = (trendingMovies.results ?? []).filter((movie) => isDateReleased(movie.release_date));
    for (const [index, movie] of releasedMovies.slice(0, 4).entries()) {
      const id = candidateId(movie.id, "movie");
      if (excluded.has(id)) continue;
      const base = {
        id,
        tmdbId: movie.id,
        mediaType: "movie" as const,
        title: movie.title,
        posterPath: movie.poster_path ?? null,
      };
      addHint(byId, base, "Trending today", 100 - index);
    }
    const releasedTv = (trendingTv.results ?? []).filter((show) => isDateReleased(show.first_air_date));
    for (const [index, show] of releasedTv.slice(0, 4).entries()) {
      const id = candidateId(show.id, "tv");
      if (excluded.has(id)) continue;
      const base = {
        id,
        tmdbId: show.id,
        mediaType: "tv" as const,
        title: show.name,
        posterPath: show.poster_path ?? null,
      };
      addHint(byId, base, "Trending today", 96 - index);
    }
  } else {
    for (const list of lists) {
      for (const it of list.items) {
        const id = candidateId(it.tmdbId, it.mediaType);
        if (excluded.has(id)) continue;
        const base = {
          id,
          tmdbId: it.tmdbId,
          mediaType: normMedia(it.mediaType),
          title: it.title,
          posterPath: it.posterPath ?? null,
        };
        addHint(byId, base, `List: ${list.name}`, 5 + recencyBoost(it.createdAt));
        mergeListTouch(anchorById, base.id, list.name, it.createdAt);
        if (it.note?.trim()) addHint(byId, base, "Has personal note", 6 + recencyBoost(it.createdAt));
      }
    }
    for (const pl of playlists) {
      for (const it of pl.items) {
        const id = candidateId(it.tmdbId, it.mediaType);
        if (excluded.has(id)) continue;
        const base = {
          id,
          tmdbId: it.tmdbId,
          mediaType: normMedia(it.mediaType),
          title: it.title,
          posterPath: it.posterPath ?? null,
        };
        addHint(byId, base, `Playlist: ${pl.name}`, 4 + recencyBoost(it.createdAt));
        mergePlaylistTouch(anchorById, base.id, pl.name, it.createdAt);
        if (it.note?.trim()) addHint(byId, base, "Has personal note", 6 + recencyBoost(it.createdAt));
      }
    }
    for (const wl of watchlist) {
      const id = candidateId(wl.tmdbId, wl.mediaType);
      if (excluded.has(id)) continue;
      const base = {
        id,
        tmdbId: wl.tmdbId,
        mediaType: normMedia(wl.mediaType),
        title: wl.title,
        posterPath: wl.posterPath ?? null,
      };
      addHint(byId, base, "Watchlist", 5 + recencyBoost(wl.createdAt));
      mergeWatchlistTouch(anchorById, base.id, wl.createdAt);
      if (wl.note?.trim()) addHint(byId, base, "Has personal note", 6 + recencyBoost(wl.createdAt));
    }

    await addDiscoveryCandidates(byId, {
      userId: user.id,
      favoriteGenres,
      preferredTypes: effectivePreferredTypes,
      excluded,
    });

    for (const s of sessions) {
      const meta = (s.metadata as { tmdbId?: number; mediaType?: string } | null) ?? {};
      if (typeof meta.tmdbId !== "number" || !meta.mediaType) continue;
      const id = candidateId(meta.tmdbId, meta.mediaType);
      if (excluded.has(id)) continue;
      const prev = byId.get(id);
      if (prev) {
        prev.score += 2;
        if (!prev.hints.includes("Recent title chat")) prev.hints.push("Recent title chat");
      }
    }
  }

  if (avoidTmdbId != null) {
    for (const [id, candidate] of [...byId.entries()]) {
      if (candidate.tmdbId === avoidTmdbId) byId.delete(id);
    }
  }

  for (const id of excluded) {
    byId.delete(id);
  }

  const ranked = Array.from(byId.values())
    .sort((a, b) => {
      const aDiscovery = a.hints.some((h) => h.startsWith("Matches your taste")) ? 1 : 0;
      const bDiscovery = b.hints.some((h) => h.startsWith("Matches your taste")) ? 1 : 0;
      if (bDiscovery !== aDiscovery) return bDiscovery - aDiscovery;
      return b.score - a.score || a.title.localeCompare(b.title);
    })
    .slice(0, 24);

  if (ranked.length === 0) {
    return {
      insufficientContext: true,
      message: trendingToday
        ? "No unseen titles were found in today's TMDB trending top picks."
        : onlyUnseen
          ? "No unseen titles found in your library—everything here is already logged as watched, or add more lists and try again."
          : "Add titles to your watchlist, lists, or playlists to generate tonight picks.",
    };
  }

  const discoveryRanked = ranked.filter((c) => c.hints.some((h) => h.startsWith("Matches your taste")));
  const libraryRanked = ranked.filter((c) => !c.hints.some((h) => h.startsWith("Matches your taste")));
  const toEnrich = [
    ...discoveryRanked.slice(0, 6),
    ...libraryRanked.slice(0, Math.max(0, ENRICH_LIMIT - Math.min(6, discoveryRanked.length))),
  ].slice(0, ENRICH_LIMIT);
  const enriched = await Promise.all(toEnrich.map((c) => enrichCandidate(c)));
  const withMatch = enriched.map((pick) => ({
    ...pick,
    matchPercent: calculateContentMatchPercent({
      genreIds: pick.genreIds,
      mediaType: pick.mediaType,
      favoriteGenres,
      dislikedGenres,
      preferredTypes: effectivePreferredTypes,
      voteAverage: pick.imdbRating,
      inWatchlist: pick.hints.some(
        (h) => h === "Watchlist" || h.startsWith("List:") || h.startsWith("Playlist:")
      ),
    }),
  }));
  const withWhy = withMatch.map((e) => ({
    ...e,
    whyTonight: buildWhyTonight(
      {
        hints: e.hints,
        isTrendingTodayPick: e.isTrendingTodayPick,
        genreNames: e.genreNames,
      },
      anchorById.get(e.id) ?? EMPTY_PICK_TONIGHT_ANCHOR
    ),
  }));
  const pool = selectDiversePicks(rerankPicks(withWhy, null), POOL_LIMIT).map(({ pick }) => pick);
  const rerankedWithScores = selectDiversePicks(
    rerankPicks(withWhy, rerankMode, { avoidLeadGenre }),
    PICK_LIMIT
  );
  const picks = rerankedWithScores.map(({ pick }) => pick);

  if (writeCooldownLog) {
    db.aiChatEvent
      .create({
        data: {
          userId: user.id,
          sessionId: `pick-tonight:${user.id}`,
          userMessage: "pick-for-tonight/cards",
          intent: "RECOMMENDATION",
          aiResponse: null,
          resultsCount: picks.length,
          resultIds: picks.map((p) => p.tmdbId),
          resultTypes: picks.map((p) => p.mediaType),
        },
      })
      .catch(() => {});
  }

  return { picks, pool };
}

async function getCachedDefaultPicks(
  userId: string,
  bucket: string,
  onlyUnseen: boolean,
  trendingToday: boolean
): Promise<PickForTonightApiResult> {
  return unstable_cache(
    async () =>
      buildPickForTonightResult(userId, {
        onlyUnseen,
        trendingToday,
        rerankMode: null,
        avoidTmdbId: null,
        avoidLeadGenre: null,
        writeCooldownLog: true,
      }),
    ["pick-for-tonight", userId, bucket, onlyUnseen ? "u1" : "u0", trendingToday ? "t1" : "t0"],
    { revalidate: PICK_FOR_TONIGHT_CACHE_SECONDS }
  )();
}

export async function POST(request: NextRequest) {
  try {
    let onlyUnseen = false;
    let trendingToday = false;
    let rerankMode: RerankMode | null = null;
    let avoidTmdbId: number | null = null;
    let avoidLeadGenre: string | null = null;
    let forceRefresh = false;
    try {
      const body = (await request.json()) as {
        onlyUnseen?: unknown;
        trendingToday?: unknown;
        rerankMode?: unknown;
        avoidTmdbId?: unknown;
        avoidLeadGenre?: unknown;
        forceRefresh?: unknown;
      } | null;
      if (body && body.onlyUnseen === true) onlyUnseen = true;
      if (body && body.trendingToday === true) trendingToday = true;
      if (body && body.forceRefresh === true) forceRefresh = true;
      if (
        body &&
        typeof body.rerankMode === "string" &&
        (body.rerankMode === "lighter" ||
          body.rerankMode === "shorter" ||
          body.rerankMode === "intense" ||
          body.rerankMode === "different" ||
          body.rerankMode === "thoughtful")
      ) {
        rerankMode = body.rerankMode;
      }
      if (body && typeof body.avoidTmdbId === "number" && Number.isFinite(body.avoidTmdbId)) {
        avoidTmdbId = body.avoidTmdbId;
      }
      if (body && typeof body.avoidLeadGenre === "string" && body.avoidLeadGenre.trim()) {
        avoidLeadGenre = body.avoidLeadGenre.trim();
      }
    } catch {
      // empty or invalid body — treat as default picks
    }

    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const bucket = getPickForTonightBucket();
    const useServerCache = !forceRefresh && !rerankMode && avoidTmdbId == null;

    const result = useServerCache
      ? await getCachedDefaultPicks(user.id, bucket, onlyUnseen, trendingToday)
      : await buildPickForTonightResult(user.id, {
          onlyUnseen,
          trendingToday,
          rerankMode,
          avoidTmdbId,
          avoidLeadGenre,
          writeCooldownLog: true,
        });

    return NextResponse.json(result);
  } catch (error) {
    console.error("pick-for-tonight/cards error:", error);
    return NextResponse.json({ error: "Failed to generate picks" }, { status: 500 });
  }
}

