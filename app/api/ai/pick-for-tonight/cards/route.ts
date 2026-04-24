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
import {
  EMPTY_PICK_TONIGHT_ANCHOR,
  buildWhyTonight,
  mergeListTouch,
  mergePlaylistTouch,
  mergeWatchlistTouch,
  type PickTonightAnchor,
} from "@/lib/pick-for-tonight-why-tonight";

type Media = "movie" | "tv";
type RerankMode = "lighter" | "shorter" | "intense" | "different";

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

function parseRuntimeToMinutes(runtimeText: string | null | undefined): number | null {
  if (!runtimeText) return null;
  const hMatch = runtimeText.match(/(\d+)\s*h/i);
  const mMatch = runtimeText.match(/(\d+)\s*m/i);
  const h = hMatch ? Number.parseInt(hMatch[1], 10) : 0;
  const m = mMatch ? Number.parseInt(mMatch[1], 10) : 0;
  const total = h * 60 + m;
  return Number.isFinite(total) && total > 0 ? total : null;
}

function isMatureRating(rated: string | null | undefined): boolean {
  if (!rated) return false;
  const r = rated.toUpperCase();
  return r.includes("R") || r.includes("NC-17") || r.includes("TV-MA");
}

function recencyBoost(createdAt: Date | null | undefined, now = new Date()): number {
  if (!createdAt) return 0;
  const ageDays = Math.max(0, (now.getTime() - createdAt.getTime()) / 86400000);
  if (ageDays <= 3) return 3;
  if (ageDays <= 14) return 2;
  if (ageDays <= 45) return 1;
  return 0;
}

function rerankPicks(
  picks: PickForTonightCandidate[],
  mode: RerankMode | null
): Array<{ pick: PickForTonightCandidate; score: number }> {
  const score = (p: PickForTonightCandidate): number => {
    const runtime = parseRuntimeToMinutes(p.runtimeText) ?? 120;
    const mature = isMatureRating(p.rated);
    // Episode runtime alone underestimates actual commitment for series.
    const watchCommitmentMinutes =
      p.mediaType === "tv" ? Math.round(runtime * 2.2 + 20) : runtime;
    const base = (p.imdbRating ?? 6.5) * 6 + p.hints.length * 8 + (p.justwatchRank24h ? Math.max(0, 30 - p.justwatchRank24h) : 0);
    if (!mode) return base;
    switch (mode) {
      case "shorter":
        return base + (140 - watchCommitmentMinutes) * 0.8;
      case "lighter":
        return base + (mature ? -16 : 16) - watchCommitmentMinutes * 0.12;
      case "intense":
        return base + (mature ? 20 : 0) + watchCommitmentMinutes * 0.08;
      case "different":
        // Preserve quality but push away from obvious baseline.
        return base + (mature ? 3 : 0) - watchCommitmentMinutes * 0.03;
      default:
        return base;
    }
  };

  return [...picks]
    .map((pick) => ({ pick, score: score(pick) }))
    .sort((a, b) => b.score - a.score || a.pick.title.localeCompare(b.pick.title));
}

function matchPercentsForScores(scores: number[]): number[] {
  if (scores.length === 0) return [];
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) {
    return scores.map((_, i) => Math.max(70, 96 - i * 4));
  }
  return scores.map((s) => {
    const t = (s - min) / (max - min);
    return Math.round(70 + t * 29);
  });
}

function selectDiversePicks(
  ranked: Array<{ pick: PickForTonightCandidate; score: number }>,
  limit: number
): Array<{ pick: PickForTonightCandidate; score: number }> {
  const pool = [...ranked];
  const selected: Array<{ pick: PickForTonightCandidate; score: number }> = [];
  const genreSeen = new Map<string, number>();
  const mediaSeen = new Map<string, number>();

  while (selected.length < limit && pool.length > 0) {
    let bestIndex = 0;
    let bestAdjusted = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < pool.length; i += 1) {
      const current = pool[i];
      const leadGenre = current.pick.genreNames?.[0]?.toLowerCase() ?? "";
      const genrePenalty = leadGenre ? (genreSeen.get(leadGenre) ?? 0) * 8 : 0;
      const mediaPenalty = (mediaSeen.get(current.pick.mediaType) ?? 0) * 4;
      const adjusted = current.score - genrePenalty - mediaPenalty;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = i;
      }
    }

    const chosen = pool.splice(bestIndex, 1)[0];
    selected.push(chosen);
    const g = chosen.pick.genreNames?.[0]?.toLowerCase();
    if (g) genreSeen.set(g, (genreSeen.get(g) ?? 0) + 1);
    mediaSeen.set(chosen.pick.mediaType, (mediaSeen.get(chosen.pick.mediaType) ?? 0) + 1);
  }

  return selected;
}

function arrayModeTypeToMedia(type: string | null | undefined): Media {
  return type === "tv" ? "tv" : "movie";
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

    const genreNames = ((details as { genres?: { name?: string }[] }).genres ?? [])
      .map((g) => g.name?.trim())
      .filter((x): x is string => Boolean(x));

    return {
      ...c,
      genreNames,
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

export async function POST(request: NextRequest) {
  try {
    let onlyUnseen = false;
    let trendingToday = false;
    let rerankMode: RerankMode | null = null;
    let avoidTmdbId: number | null = null;
    try {
      const body = (await request.json()) as {
        onlyUnseen?: unknown;
        trendingToday?: unknown;
        rerankMode?: unknown;
        avoidTmdbId?: unknown;
      } | null;
      if (body && body.onlyUnseen === true) onlyUnseen = true;
      if (body && body.trendingToday === true) trendingToday = true;
      if (
        body &&
        typeof body.rerankMode === "string" &&
        (body.rerankMode === "lighter" ||
          body.rerankMode === "shorter" ||
          body.rerankMode === "intense" ||
          body.rerankMode === "different")
      ) {
        rerankMode = body.rerankMode;
      }
      if (body && typeof body.avoidTmdbId === "number" && Number.isFinite(body.avoidTmdbId)) {
        avoidTmdbId = body.avoidTmdbId;
      }
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

    const anchorById = new Map<string, PickTonightAnchor>();

    const cooldownSince = new Date(Date.now() - 1000 * 60 * 60 * 72); // 72h cooldown window

    const [lists, playlists, favorites, sessions, recentPickEvents] = await Promise.all([
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
      db.favorite.findMany({
        where: { userId: user.id },
        select: { tmdbId: true, mediaType: true, title: true, posterPath: true, createdAt: true },
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
    ]);
    const recentRecommended = new Set<string>();
    for (const event of recentPickEvents) {
      for (let i = 0; i < event.resultIds.length; i += 1) {
        const tmdbId = event.resultIds[i];
        const mediaType = arrayModeTypeToMedia(event.resultTypes[i]);
        recentRecommended.add(candidateId(tmdbId, mediaType));
      }
    }


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
          addHint(byId, base, `List: ${list.name}`, 3 + recencyBoost(it.createdAt));
          mergeListTouch(anchorById, base.id, list.name, it.createdAt);
          if (it.note?.trim()) addHint(byId, base, "Has personal note", 4 + recencyBoost(it.createdAt));
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
          addHint(byId, base, `Playlist: ${pl.name}`, 2 + recencyBoost(it.createdAt));
          mergePlaylistTouch(anchorById, base.id, pl.name, it.createdAt);
          if (it.note?.trim()) addHint(byId, base, "Has personal note", 4 + recencyBoost(it.createdAt));
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
        addHint(byId, base, "Saved titles", 1 + recencyBoost(fav.createdAt));
        mergeWatchlistTouch(anchorById, base.id, fav.createdAt);
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
    if (avoidTmdbId != null) {
      for (const [id, candidate] of [...byId.entries()]) {
        if (candidate.tmdbId === avoidTmdbId) byId.delete(id);
      }
    }

    for (const [id, candidate] of byId.entries()) {
      if (recentRecommended.has(id)) {
        candidate.score -= 8; // keep available, but make repeats less likely during cooldown window
      }
    }

    const ranked = Array.from(byId.values())
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 20);

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
    const rerankedWithScores = selectDiversePicks(rerankPicks(enriched, rerankMode), 6);
    const percents = matchPercentsForScores(rerankedWithScores.map((x) => x.score));
    const reranked = rerankedWithScores.map(({ pick: e }, idx) => ({
        ...e,
        matchPercent: percents[idx] ?? 70,
        whyTonight: buildWhyTonight(
          {
            hints: e.hints,
            isTrendingTodayPick: e.isTrendingTodayPick,
            genreNames: e.genreNames,
          },
          anchorById.get(e.id) ?? EMPTY_PICK_TONIGHT_ANCHOR
        ),
      }));

    // Non-blocking: store picks to reduce near-term repetition.
    db.aiChatEvent
      .create({
        data: {
          userId: user.id,
          sessionId: `pick-tonight:${user.id}`,
          userMessage: "pick-for-tonight/cards",
          intent: "RECOMMENDATION",
          aiResponse: null,
          resultsCount: reranked.length,
          resultIds: reranked.map((p) => p.tmdbId),
          resultTypes: reranked.map((p) => p.mediaType),
        },
      })
      .catch(() => {
        // Ignore logging failures; recommendation response should still succeed.
      });
    return NextResponse.json({ picks: reranked });
  } catch (error) {
    console.error("pick-for-tonight/cards error:", error);
    return NextResponse.json({ error: "Failed to generate picks" }, { status: 500 });
  }
}

