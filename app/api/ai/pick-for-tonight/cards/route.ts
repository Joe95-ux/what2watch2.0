import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  getMovieDetails,
  getTVDetails,
  getTrendingMovies,
} from "@/lib/tmdb";
import { getOMDBFullData } from "@/lib/omdb";
import { getJustWatchAvailability } from "@/lib/justwatch";
import type { PickForTonightCandidate } from "@/lib/pick-for-tonight-types";

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

    return {
      ...c,
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

export async function POST(request: NextRequest) {
  try {
    let onlyUnseen = false;
    let trendingToday = false;
    try {
      const body = (await request.json()) as { onlyUnseen?: unknown; trendingToday?: unknown } | null;
      if (body && body.onlyUnseen === true) onlyUnseen = true;
      if (body && body.trendingToday === true) trendingToday = true;
    } catch {
      // empty or invalid body — treat as default picks
    }

    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, role: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "BETA_ADMIN_ONLY", message: "Pick for tonight is currently in admin-only beta." },
        { status: 403 }
      );
    }

    const [lists, playlists, favorites, sessions] = await Promise.all([
      db.list.findMany({
        where: { userId: user.id },
        select: { name: true, items: { select: { tmdbId: true, mediaType: true, title: true, note: true, posterPath: true } } },
      }),
      db.playlist.findMany({
        where: { userId: user.id },
        select: { name: true, items: { select: { tmdbId: true, mediaType: true, title: true, note: true, posterPath: true } } },
      }),
      db.favorite.findMany({
        where: { userId: user.id },
        select: { tmdbId: true, mediaType: true, title: true, posterPath: true },
      }),
      db.aiChatSession.findMany({
        where: { userId: user.id, mode: "movie-details" },
        orderBy: { updatedAt: "desc" },
        take: 16,
        select: { metadata: true, updatedAt: true },
      }),
    ]);

    const byId = new Map<string, BaseCandidate>();
    if (trendingToday) {
      const trending = await getTrendingMovies("day", 1);
      const releasedTrending = (trending.results ?? []).filter((movie) => isDateReleased(movie.release_date));
      for (const [index, movie] of releasedTrending.slice(0, 5).entries()) {
        const base = {
          id: candidateId(movie.id, "movie"),
          tmdbId: movie.id,
          mediaType: "movie" as const,
          title: movie.title,
          posterPath: movie.poster_path ?? null,
        };
        addHint(byId, base, "Trending today", 100 - index);
      }
    } else {
      for (const list of lists) {
        for (const it of list.items) {
          const base = {
            id: candidateId(it.tmdbId, it.mediaType),
            tmdbId: it.tmdbId,
            mediaType: normMedia(it.mediaType),
            title: it.title,
            posterPath: it.posterPath ?? null,
          };
          addHint(byId, base, `List: ${list.name}`, 3);
          if (it.note?.trim()) addHint(byId, base, "Has personal note", 4);
        }
      }
      for (const pl of playlists) {
        for (const it of pl.items) {
          const base = {
            id: candidateId(it.tmdbId, it.mediaType),
            tmdbId: it.tmdbId,
            mediaType: normMedia(it.mediaType),
            title: it.title,
            posterPath: it.posterPath ?? null,
          };
          addHint(byId, base, `Playlist: ${pl.name}`, 2);
          if (it.note?.trim()) addHint(byId, base, "Has personal note", 4);
        }
      }
      for (const fav of favorites) {
        const base = {
          id: candidateId(fav.tmdbId, fav.mediaType),
          tmdbId: fav.tmdbId,
          mediaType: normMedia(fav.mediaType),
          title: fav.title,
          posterPath: fav.posterPath ?? null,
        };
        addHint(byId, base, "Watchlist", 1);
      }

      for (const s of sessions) {
        const meta = (s.metadata as { tmdbId?: number; mediaType?: string } | null) ?? {};
        if (typeof meta.tmdbId !== "number" || !meta.mediaType) continue;
        const id = candidateId(meta.tmdbId, meta.mediaType);
        const prev = byId.get(id);
        if (prev) {
          prev.score += 2;
          if (!prev.hints.includes("Recent title chat")) prev.hints.push("Recent title chat");
        }
      }
    }

    if (onlyUnseen) {
      const logs = await db.viewingLog.findMany({
        where: { userId: user.id },
        select: { tmdbId: true, mediaType: true },
      });
      const watched = new Set(logs.map((l) => candidateId(l.tmdbId, l.mediaType)));
      for (const id of [...byId.keys()]) {
        if (watched.has(id)) byId.delete(id);
      }
    }

    const ranked = Array.from(byId.values())
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 6);

    if (ranked.length === 0) {
      return NextResponse.json({
        insufficientContext: true,
        message: trendingToday
          ? "No unseen titles were found in today's TMDB trending top picks."
          : onlyUnseen
            ? "No unseen titles found in your library—everything here is already logged as watched, or add more lists and try again."
            : "Add titles to your watchlist, lists, or playlists to generate tonight picks.",
      });
    }

    const enriched = await Promise.all(ranked.map((c) => enrichCandidate(c)));
    return NextResponse.json({ picks: enriched });
  } catch (error) {
    console.error("pick-for-tonight/cards error:", error);
    return NextResponse.json({ error: "Failed to generate picks" }, { status: 500 });
  }
}

