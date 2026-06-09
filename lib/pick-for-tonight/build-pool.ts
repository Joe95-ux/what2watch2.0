import { db } from "@/lib/db";
import { LIGHT_POOL_CAP, ENRICH_LIMIT, ENRICH_SLOTS, PICK_COOLDOWN_HOURS } from "@/lib/pick-for-tonight/constants";
import {
  mergeListTouch,
  mergePlaylistTouch,
  mergeWatchlistTouch,
} from "@/lib/pick-for-tonight/anchors";
import {
  addDiscoveryCandidates,
  addTrendingCandidates,
  recencyBoost,
  upsertLibraryCandidate,
} from "@/lib/pick-for-tonight/discovery";
import type { LightCandidate, PickSlot, PickTonightAnchor, UserPickContext } from "@/lib/pick-for-tonight/internal-types";
import { candidateId, normMedia, type PickMedia } from "@/lib/pick-for-tonight/media";

function calendarDaysSince(from: Date, now: Date): number {
  const f = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((t.getTime() - f.getTime()) / 86400000));
}

function sortByScore(items: LightCandidate[]): LightCandidate[] {
  return [...items].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

function takeFromSlot(candidates: LightCandidate[], slot: PickSlot, limit: number): LightCandidate[] {
  return sortByScore(candidates.filter((c) => c.slot === slot)).slice(0, limit);
}

/** Select diverse enrich batch across library / discovery / trending / stretch slots. */
export function selectForEnrich(candidates: LightCandidate[], total = ENRICH_LIMIT): LightCandidate[] {
  const bySlot = {
    library: takeFromSlot(candidates, "library", ENRICH_SLOTS.library),
    discovery: takeFromSlot(candidates, "discovery", ENRICH_SLOTS.discovery),
    trending: takeFromSlot(candidates, "trending", ENRICH_SLOTS.trending),
    stretch: takeFromSlot(candidates, "stretch", ENRICH_SLOTS.stretch),
  };

  const merged: LightCandidate[] = [];
  const seen = new Set<string>();
  const push = (list: LightCandidate[]) => {
    for (const c of list) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      merged.push(c);
    }
  };

  push(bySlot.discovery);
  push(bySlot.library);
  push(bySlot.stretch);
  push(bySlot.trending);

  if (merged.length < total) {
    const rest = sortByScore(candidates.filter((c) => !seen.has(c.id)));
    for (const c of rest) {
      if (merged.length >= total) break;
      seen.add(c.id);
      merged.push(c);
    }
  }

  return merged.slice(0, total);
}

export type BuildPoolResult = {
  toEnrich: LightCandidate[];
  anchorById: Map<string, PickTonightAnchor>;
  context: UserPickContext;
  insufficientMessage?: string;
};

export async function buildLightPool(
  userId: string,
  opts: { onlyUnseen: boolean; trendingToday: boolean }
): Promise<BuildPoolResult> {
  const anchorById = new Map<string, PickTonightAnchor>();
  const now = new Date();
  const cooldownSince = new Date(Date.now() - 1000 * 60 * 60 * PICK_COOLDOWN_HOURS);

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
    return {
      toEnrich: [],
      anchorById,
      context: { userId, favoriteGenres: [], dislikedGenres: [], preferredTypes: ["movie", "tv"] },
      insufficientMessage: "User not found.",
    };
  }

  const favoriteGenres = user.preferences?.favoriteGenres ?? [];
  const dislikedGenres = user.preferences?.dislikedGenres ?? [];
  const preferredTypes = (user.preferences?.preferredTypes ?? ["movie", "tv"]).filter(
    (t): t is PickMedia => t === "movie" || t === "tv"
  );
  const effectivePreferredTypes: PickMedia[] =
    preferredTypes.length > 0 ? preferredTypes : (["movie", "tv"] as PickMedia[]);

  const context: UserPickContext = {
    userId: user.id,
    favoriteGenres,
    dislikedGenres,
    preferredTypes: effectivePreferredTypes,
  };

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
  if (opts.onlyUnseen) {
    for (const row of watchedTitles) addExcluded(row.tmdbId, row.mediaType);
    for (const row of viewingLogs) addExcluded(row.tmdbId, row.mediaType);
  }

  const byId = new Map<string, LightCandidate>();

  if (opts.trendingToday) {
    await addTrendingCandidates(byId, { preferredTypes: effectivePreferredTypes, excluded });
  } else {
    for (const list of lists) {
      for (const it of list.items) {
        upsertLibraryCandidate(
          byId,
          {
            tmdbId: it.tmdbId,
            mediaType: it.mediaType,
            title: it.title,
            posterPath: it.posterPath ?? null,
            reason: { code: "list", weight: 5 + recencyBoost(it.createdAt), name: list.name },
            score: 5 + recencyBoost(it.createdAt),
            extraHint: it.note?.trim() ? "Has personal note" : undefined,
          },
          excluded
        );
        mergeListTouch(anchorById, candidateId(it.tmdbId, it.mediaType), list.name, it.createdAt);
      }
    }

    for (const pl of playlists) {
      for (const it of pl.items) {
        upsertLibraryCandidate(
          byId,
          {
            tmdbId: it.tmdbId,
            mediaType: it.mediaType,
            title: it.title,
            posterPath: it.posterPath ?? null,
            reason: { code: "playlist", weight: 4 + recencyBoost(it.createdAt), name: pl.name },
            score: 4 + recencyBoost(it.createdAt),
            extraHint: it.note?.trim() ? "Has personal note" : undefined,
          },
          excluded
        );
        mergePlaylistTouch(anchorById, candidateId(it.tmdbId, it.mediaType), pl.name, it.createdAt);
      }
    }

    for (const wl of watchlist) {
      const days = calendarDaysSince(wl.createdAt, now);
      upsertLibraryCandidate(
        byId,
        {
          tmdbId: wl.tmdbId,
          mediaType: wl.mediaType,
          title: wl.title,
          posterPath: wl.posterPath ?? null,
          reason: { code: "watchlist", weight: 5 + recencyBoost(wl.createdAt), days },
          score: 5 + recencyBoost(wl.createdAt),
          extraHint: wl.note?.trim() ? "Has personal note" : undefined,
        },
        excluded
      );
      mergeWatchlistTouch(anchorById, candidateId(wl.tmdbId, wl.mediaType), wl.createdAt);
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
        if (!prev.reasons.some((r) => r.code === "chat")) {
          prev.reasons.push({ code: "chat", weight: 4 });
        }
        if (!prev.hints.includes("Recent title chat")) prev.hints.push("Recent title chat");
      }
    }
  }

  for (const id of excluded) {
    byId.delete(id);
  }

  const all = sortByScore(Array.from(byId.values())).slice(0, LIGHT_POOL_CAP);

  if (all.length === 0) {
    return {
      toEnrich: [],
      anchorById,
      context,
      insufficientMessage: opts.trendingToday
        ? "No unseen titles were found in today's TMDB trending top picks."
        : opts.onlyUnseen
          ? "No unseen titles found in your library—everything here is already logged as watched, or add more lists and try again."
          : "Add titles to your watchlist, lists, or playlists to generate tonight picks.",
    };
  }

  return {
    toEnrich: selectForEnrich(all),
    anchorById,
    context,
  };
}
