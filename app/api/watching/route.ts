import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { WatchingDashboardResponse, WatchingSessionDTO, WatchingTitlePresenceResponse } from "@/lib/watching-types";
import { triggerWatchingDashboardUpdated, triggerWatchingTitleUpdated } from "@/lib/pusher/server";
import { getMovieDetails, getTVDetails, getTVSeasonDetails } from "@/lib/tmdb";
import { moderateWatchingThoughtContent } from "@/lib/moderation";
import {
  syncEpisodeViewingFromSession,
  syncEpisodeViewingFromSessions,
  type WatchedUpsertSession,
} from "@/lib/watching-finish-sync";

const WATCHING_AUTO_TIMEOUT_MS = 1000 * 60 * 60 * 4; // 4 hours

type AdminUser = {
  id: string;
  role: string | null;
  isForumAdmin: boolean;
};

type RequireAdminResult =
  | { ok: true; user: AdminUser }
  | { ok: false; response: NextResponse<{ error: string }> };

type RequireUserResult =
  | { ok: true; user: { id: string; role: string | null; isForumAdmin: boolean } }
  | { ok: false; response: NextResponse<{ error: string }> };

async function requireSignedInUser(): Promise<RequireUserResult> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true, role: true, isForumAdmin: true },
  });
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }
  return { ok: true, user };
}

async function requireAdmin(): Promise<RequireAdminResult> {
  const userResult = await requireSignedInUser();
  if (!userResult.ok) return userResult;
  const user = userResult.user;

  const isAdmin = user.isForumAdmin || user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  if (!isAdmin) {
    return { ok: false, response: NextResponse.json({ error: "WATCHING_BETA_ADMIN_ONLY" }, { status: 403 }) };
  }
  return { ok: true, user };
}

function isRequireAdminFailure(result: RequireAdminResult): result is Extract<RequireAdminResult, { ok: false }> {
  return result.ok === false;
}

function isRequireUserFailure(result: RequireUserResult): result is Extract<RequireUserResult, { ok: false }> {
  return result.ok === false;
}

async function upsertWatchedTitle(
  session: WatchedUpsertSession,
  source: string,
  seenAt: Date = new Date()
): Promise<void> {
  await db.watchedTitle.upsert({
    where: {
      userId_tmdbId_mediaType: {
        userId: session.userId,
        tmdbId: session.tmdbId,
        mediaType: session.mediaType,
      },
    },
    create: {
      userId: session.userId,
      tmdbId: session.tmdbId,
      mediaType: session.mediaType,
      title: session.title,
      posterPath: session.posterPath ?? null,
      backdropPath: session.backdropPath ?? null,
      seenAt,
      source,
    },
    update: {
      title: session.title,
      posterPath: session.posterPath ?? null,
      backdropPath: session.backdropPath ?? null,
      seenAt,
      source,
    },
  });
}

async function upsertWatchedTitles(
  sessions: WatchedUpsertSession[],
  source: string,
  seenAt: Date = new Date()
): Promise<void> {
  if (!sessions.length) return;
  await Promise.all(sessions.map((session) => upsertWatchedTitle(session, source, seenAt)));
}

async function autoTimeoutWatchingSessions(userIds: string[]): Promise<void> {
  if (!userIds.length) return;
  const threshold = new Date(Date.now() - WATCHING_AUTO_TIMEOUT_MS);
  const staleSessions = await db.watchingSession.findMany({
    where: {
      userId: { in: userIds },
      status: "WATCHING_NOW",
      updatedAt: { lt: threshold },
    },
    select: {
      id: true,
      userId: true,
      tmdbId: true,
      mediaType: true,
      title: true,
      posterPath: true,
      backdropPath: true,
      seasonNumber: true,
      episodeNumber: true,
      updatedAt: true,
    },
  });
  await Promise.all(
    staleSessions.map((session) =>
      db.watchingSession.updateMany({
        where: {
          id: session.id,
          status: "WATCHING_NOW",
        },
        data: {
          status: "JUST_FINISHED",
          endedAt: session.updatedAt,
        },
      })
    )
  );
  await Promise.all(
    staleSessions.map(async (session) => {
      const seenAt = session.updatedAt;
      await upsertWatchedTitle(session, "watching_timeout_finish", seenAt);
      await syncEpisodeViewingFromSession(session, seenAt);
    })
  );
}

type SessionTitleMetadata = {
  releaseYear: number | null;
  creatorOrDirector: string | null;
  runtimeMinutes: number | null;
};

async function buildSessionMetadataMap(
  sessions: Array<{
    tmdbId: number;
    mediaType: "movie" | "tv";
    seasonNumber?: number | null;
    episodeNumber?: number | null;
  }>
): Promise<Map<string, SessionTitleMetadata>> {
  const uniqueKeys = new Set<string>();
  for (const session of sessions) {
    const key =
      session.mediaType === "tv" &&
      Number.isInteger(session.seasonNumber) &&
      Number.isInteger(session.episodeNumber)
        ? `${session.mediaType}:${session.tmdbId}:s${session.seasonNumber}:e${session.episodeNumber}`
        : `${session.mediaType}:${session.tmdbId}`;
    uniqueKeys.add(key);
  }

  const map = new Map<string, SessionTitleMetadata>();
  const tvDetailsCache = new Map<
    number,
    Awaited<ReturnType<typeof getTVDetails>>
  >();
  const tvSeasonCache = new Map<
    string,
    Awaited<ReturnType<typeof getTVSeasonDetails>>
  >();
  await Promise.all(
    Array.from(uniqueKeys).map(async (key) => {
      const [mediaType, idRaw, seasonRaw, episodeRaw] = key.split(":");
      const tmdbId = Number(idRaw);
      try {
        if (mediaType === "movie") {
          const details = await getMovieDetails(tmdbId);
          const releaseYear = details.release_date ? Number(details.release_date.slice(0, 4)) : null;
          const crew = (details as { credits?: { crew?: Array<{ job?: string; name?: string }> } }).credits?.crew ?? [];
          const director =
            crew.find((member) => member.job === "Director")?.name ??
            crew.find((member) => member.job === "Co-Director")?.name ??
            null;
          const runtimeMinutes =
            typeof details.runtime === "number" && Number.isFinite(details.runtime) ? Math.max(1, Math.round(details.runtime)) : null;
          map.set(key, {
            releaseYear: Number.isFinite(releaseYear) ? releaseYear : null,
            creatorOrDirector: director,
            runtimeMinutes,
          });
          return;
        }

        if (mediaType === "tv") {
          let details = tvDetailsCache.get(tmdbId);
          if (!details) {
            details = await getTVDetails(tmdbId);
            tvDetailsCache.set(tmdbId, details);
          }
          const releaseYear = details.first_air_date ? Number(details.first_air_date.slice(0, 4)) : null;
          const creators = (details as { created_by?: Array<{ name?: string }> }).created_by ?? [];
          const creator = creators[0]?.name ?? null;
          const episodeRunTime = Array.isArray(details.episode_run_time)
            ? details.episode_run_time.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)
            : [];
          const runtimeMinutes = episodeRunTime.length
            ? Math.max(1, Math.round(episodeRunTime.reduce((sum, value) => sum + value, 0) / episodeRunTime.length))
            : null;
          const seasonNumber = seasonRaw?.startsWith("s") ? Number(seasonRaw.slice(1)) : NaN;
          const episodeNumber = episodeRaw?.startsWith("e") ? Number(episodeRaw.slice(1)) : NaN;
          let resolvedRuntime = runtimeMinutes;
          if (Number.isInteger(seasonNumber) && seasonNumber > 0 && Number.isInteger(episodeNumber) && episodeNumber > 0) {
            const seasonKey = `${tmdbId}:${seasonNumber}`;
            let seasonDetails = tvSeasonCache.get(seasonKey);
            if (!seasonDetails) {
              seasonDetails = await getTVSeasonDetails(tmdbId, seasonNumber);
              tvSeasonCache.set(seasonKey, seasonDetails);
            }
            const episode = seasonDetails.episodes.find((item) => item.episode_number === episodeNumber);
            const episodeRuntime =
              typeof episode?.runtime === "number" && Number.isFinite(episode.runtime) && episode.runtime > 0
                ? Math.round(episode.runtime)
                : null;
            resolvedRuntime = episodeRuntime ?? runtimeMinutes;
          }
          map.set(key, {
            releaseYear: Number.isFinite(releaseYear) ? releaseYear : null,
            creatorOrDirector: creator,
            runtimeMinutes: resolvedRuntime,
          });
        }
      } catch (error) {
        console.warn(`watching metadata fetch failed for ${key}:`, error);
        map.set(key, { releaseYear: null, creatorOrDirector: null, runtimeMinutes: null });
      }
    })
  );

  return map;
}

function toSessionDTO(
  session: {
    id: string;
    userId: string;
    tmdbId: number;
    mediaType: string;
    title: string;
    posterPath: string | null;
    backdropPath: string | null;
    seasonNumber: number | null;
    episodeNumber: number | null;
    status: "WATCHING_NOW" | "JUST_FINISHED" | "STOPPED";
    visibility: "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE";
    progressPercent: number | null;
    startedAt: Date;
    endedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    user: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null };
    thoughts: Array<{
      id: string;
      content: string;
      isSpoiler: boolean;
      createdAt: Date;
      user: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null };
    }>;
  },
  metadataByTitle?: Map<string, SessionTitleMetadata>,
  reactionCountMap?: Map<string, number>,
  replyCountMap?: Map<string, number>,
  myReactionsMap?: Map<string, string[]>
): WatchingSessionDTO {
  const metaKeyWithEpisode =
    session.mediaType === "tv" &&
    typeof session.seasonNumber === "number" &&
    typeof session.episodeNumber === "number"
      ? `${session.mediaType}:${session.tmdbId}:s${session.seasonNumber}:e${session.episodeNumber}`
      : `${session.mediaType}:${session.tmdbId}`;
  const fallbackMetaKey = `${session.mediaType}:${session.tmdbId}`;
  const metadata = metadataByTitle?.get(metaKeyWithEpisode) ?? metadataByTitle?.get(fallbackMetaKey);
  return {
    id: session.id,
    userId: session.userId,
    tmdbId: session.tmdbId,
    mediaType: session.mediaType as "movie" | "tv",
    title: session.title,
    posterPath: session.posterPath,
    backdropPath: session.backdropPath,
    seasonNumber: typeof session.seasonNumber === "number" ? session.seasonNumber : null,
    episodeNumber: typeof session.episodeNumber === "number" ? session.episodeNumber : null,
    releaseYear: metadata?.releaseYear ?? null,
    creatorOrDirector: metadata?.creatorOrDirector ?? null,
    runtimeMinutes: metadata?.runtimeMinutes ?? null,
    status: session.status,
    visibility: session.visibility,
    progressPercent: session.progressPercent,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    user: session.user,
    thoughts: session.thoughts.map((t) => ({
      id: t.id,
      content: t.content,
      isSpoiler: t.isSpoiler,
      createdAt: t.createdAt.toISOString(),
      reactionCount: reactionCountMap?.get(t.id) ?? 0,
      replyCount: replyCountMap?.get(t.id) ?? 0,
      myReactions: myReactionsMap?.get(t.id) ?? [],
      user: t.user,
    })),
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<WatchingDashboardResponse | WatchingTitlePresenceResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const tmdbIdParam = searchParams.get("tmdbId");
    const mediaTypeParam = searchParams.get("mediaType");

    if (tmdbIdParam && (mediaTypeParam === "movie" || mediaTypeParam === "tv")) {
      const tmdbId = Number(tmdbIdParam);
      if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        return NextResponse.json({ error: "Invalid tmdbId" }, { status: 400 });
      }

      const signedIn = await requireSignedInUser();
      const currentUserId = signedIn.ok ? signedIn.user.id : null;

      await autoTimeoutWatchingSessions(currentUserId ? [currentUserId] : []);
      const sessions = await db.watchingSession.findMany({
        where: {
          tmdbId,
          mediaType: mediaTypeParam,
          status: "WATCHING_NOW",
          OR: [
            { visibility: "PUBLIC" },
            ...(currentUserId ? [{ userId: currentUserId }] : []),
          ],
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { startedAt: "desc" },
        take: 24,
      });

      const thoughts = await db.watchingThought.findMany({
        where: {
          session: {
            tmdbId,
            mediaType: mediaTypeParam,
            status: {
              in: ["WATCHING_NOW", "JUST_FINISHED", "STOPPED"],
            },
          },
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          session: { select: { id: true, status: true, seasonNumber: true, episodeNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 60,
      });
      const thoughtIds = thoughts.map((thought) => thought.id);
      const [reactionRows, replyRows, myReactionRows] = await Promise.all([
        thoughtIds.length
          ? db.watchingThoughtReaction.findMany({
              where: { thoughtId: { in: thoughtIds } },
              select: { thoughtId: true },
            })
          : Promise.resolve([]),
        thoughtIds.length
          ? db.watchingThoughtReply.findMany({
              where: { thoughtId: { in: thoughtIds } },
              select: { thoughtId: true },
            })
          : Promise.resolve([]),
        thoughtIds.length && currentUserId
          ? db.watchingThoughtReaction.findMany({
              where: { thoughtId: { in: thoughtIds }, userId: currentUserId },
              select: { thoughtId: true, reactionType: true },
            })
          : Promise.resolve([]),
      ]);
      const reactionCountMap = new Map<string, number>();
      for (const row of reactionRows) {
        reactionCountMap.set(row.thoughtId, (reactionCountMap.get(row.thoughtId) ?? 0) + 1);
      }
      const replyCountMap = new Map<string, number>();
      for (const row of replyRows) {
        replyCountMap.set(row.thoughtId, (replyCountMap.get(row.thoughtId) ?? 0) + 1);
      }
      const myReactionsMap = new Map<string, string[]>();
      for (const row of myReactionRows) {
        const list = myReactionsMap.get(row.thoughtId) ?? [];
        list.push(row.reactionType);
        myReactionsMap.set(row.thoughtId, list);
      }

      return NextResponse.json({
        tmdbId,
        mediaType: mediaTypeParam,
        watcherCount: sessions.length,
        isCurrentUserWatching: currentUserId ? sessions.some((session) => session.userId === currentUserId) : false,
        watchers: sessions.slice(0, 7).map((session) => ({
          sessionId: session.id,
          userId: session.userId,
          startedAt: session.startedAt.toISOString(),
          progressPercent: session.progressPercent,
          user: session.user,
        })),
        recentThoughts: thoughts
          .filter((thought) => !thought.isSpoiler)
          .slice(0, 12)
          .map((thought) => ({
            thoughtId: thought.id,
            sessionId: thought.session.id,
            seasonNumber: thought.session.seasonNumber ?? null,
            episodeNumber: thought.session.episodeNumber ?? null,
            content: thought.content,
            createdAt: thought.createdAt.toISOString(),
            isSpoiler: false as const,
            reactionCount: reactionCountMap.get(thought.id) ?? 0,
            replyCount: replyCountMap.get(thought.id) ?? 0,
            myReactions: myReactionsMap.get(thought.id) ?? [],
            sessionStatus: thought.session.status,
            user: thought.user,
          })),
        spoilerThoughts: thoughts
          .filter((thought) => thought.isSpoiler)
          .slice(0, 12)
          .map((thought) => ({
            thoughtId: thought.id,
            sessionId: thought.session.id,
            seasonNumber: thought.session.seasonNumber ?? null,
            episodeNumber: thought.session.episodeNumber ?? null,
            content: thought.content,
            createdAt: thought.createdAt.toISOString(),
            isSpoiler: true as const,
            reactionCount: reactionCountMap.get(thought.id) ?? 0,
            replyCount: replyCountMap.get(thought.id) ?? 0,
            myReactions: myReactionsMap.get(thought.id) ?? [],
            sessionStatus: thought.session.status,
            user: thought.user,
          })),
      });
    }

    const authResult = await requireSignedInUser();
    if (isRequireUserFailure(authResult)) return authResult.response;
    const currentUser = authResult.user;

    const followRows = await db.follow.findMany({
      where: { followerId: currentUser.id },
      select: { followingId: true },
    });
    const followingIds = followRows.map((f) => f.followingId);
    const networkIds = [currentUser.id, ...followingIds];
    await autoTimeoutWatchingSessions(networkIds);
    const justFinishedWindowStart = new Date(Date.now() - 1000 * 60 * 60 * 48);

    let [currentSessionRaw, watchingNowRaw, justFinishedRaw] = await Promise.all([
      db.watchingSession.findFirst({
        where: { userId: currentUser.id, status: "WATCHING_NOW" },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          thoughts: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
          },
        },
        orderBy: { startedAt: "desc" },
      }),
      db.watchingSession.findMany({
        where: {
          userId: { in: networkIds },
          OR: [
            {
              status: "WATCHING_NOW",
              OR: [
                { visibility: "PUBLIC" },
                { visibility: "FOLLOWERS_ONLY", userId: { in: followingIds } },
                { userId: currentUser.id },
              ],
            },
            { status: "STOPPED", userId: currentUser.id, endedAt: null },
          ],
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          thoughts: {
            orderBy: { createdAt: "desc" },
            take: 2,
            include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
          },
        },
        orderBy: { startedAt: "desc" },
        take: 40,
      }),
      db.watchingSession.findMany({
        where: {
          status: "JUST_FINISHED",
          userId: { in: networkIds },
          endedAt: { gte: justFinishedWindowStart },
          OR: [
            { visibility: "PUBLIC" },
            { visibility: "FOLLOWERS_ONLY", userId: { in: followingIds } },
            { userId: currentUser.id },
          ],
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          thoughts: {
            orderBy: { createdAt: "desc" },
            take: 3,
            include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
          },
        },
        orderBy: { endedAt: "desc" },
        take: 40,
      }),
    ]);

    const allSessionsRaw = [
      ...(currentSessionRaw ? [currentSessionRaw] : []),
      ...watchingNowRaw,
      ...justFinishedRaw,
    ];
    const metadataByTitle = await buildSessionMetadataMap(
      allSessionsRaw.map((session) => ({
        tmdbId: session.tmdbId,
        mediaType: session.mediaType as "movie" | "tv",
        seasonNumber: session.seasonNumber ?? null,
        episodeNumber: session.episodeNumber ?? null,
      }))
    );

    const autoFinishNow = new Date();
    const autoFinishSessionIds = watchingNowRaw
      .filter((session) => {
        if (session.status !== "WATCHING_NOW") return false;
        const key =
          session.mediaType === "tv" &&
          Number.isInteger(session.seasonNumber) &&
          Number.isInteger(session.episodeNumber)
            ? `${session.mediaType}:${session.tmdbId}:s${session.seasonNumber}:e${session.episodeNumber}`
            : `${session.mediaType}:${session.tmdbId}`;
        const runtimeMinutes = metadataByTitle.get(key)?.runtimeMinutes;
        if (!runtimeMinutes || runtimeMinutes <= 0) return false;
        const elapsedMs = autoFinishNow.getTime() - new Date(session.startedAt).getTime();
        return elapsedMs >= runtimeMinutes * 60 * 1000;
      })
      .map((session) => session.id);

    if (autoFinishSessionIds.length) {
      await db.watchingSession.updateMany({
        where: {
          id: { in: autoFinishSessionIds },
          status: "WATCHING_NOW",
        },
        data: {
          status: "JUST_FINISHED",
          endedAt: autoFinishNow,
        },
      });
      await upsertWatchedTitles(
        watchingNowRaw.filter((session) => autoFinishSessionIds.includes(session.id)).map((session) => ({
          userId: session.userId,
          tmdbId: session.tmdbId,
          mediaType: session.mediaType,
          title: session.title,
          posterPath: session.posterPath ?? null,
          backdropPath: session.backdropPath ?? null,
          seasonNumber: session.seasonNumber ?? null,
          episodeNumber: session.episodeNumber ?? null,
        })),
        "watching_auto_finish",
        autoFinishNow
      );
      await syncEpisodeViewingFromSessions(
        watchingNowRaw.filter((session) => autoFinishSessionIds.includes(session.id)).map((session) => ({
          userId: session.userId,
          tmdbId: session.tmdbId,
          mediaType: session.mediaType,
          title: session.title,
          posterPath: session.posterPath ?? null,
          backdropPath: session.backdropPath ?? null,
          seasonNumber: session.seasonNumber ?? null,
          episodeNumber: session.episodeNumber ?? null,
        })),
        autoFinishNow
      );

      const autoFinishedSet = new Set(autoFinishSessionIds);
      const autoFinishedSessions = watchingNowRaw
        .filter((session) => autoFinishedSet.has(session.id))
        .map((session) => ({
          ...session,
          status: "JUST_FINISHED" as const,
          endedAt: session.endedAt ?? autoFinishNow,
          updatedAt: autoFinishNow,
        }));

      watchingNowRaw = watchingNowRaw.filter((session) => !autoFinishedSet.has(session.id));
      justFinishedRaw = [...autoFinishedSessions, ...justFinishedRaw]
        .sort(
          (a, b) =>
            new Date(b.endedAt ?? b.updatedAt).getTime() -
            new Date(a.endedAt ?? a.updatedAt).getTime()
        )
        .slice(0, 40);

      if (currentSessionRaw && autoFinishedSet.has(currentSessionRaw.id)) {
        currentSessionRaw = null;
      }
    }

    const allThoughtIds = [
      ...(currentSessionRaw?.thoughts.map((thought) => thought.id) ?? []),
      ...watchingNowRaw.flatMap((session) => session.thoughts.map((thought) => thought.id)),
      ...justFinishedRaw.flatMap((session) => session.thoughts.map((thought) => thought.id)),
    ];

    const uniqueThoughtIds = Array.from(new Set(allThoughtIds));
    const [reactionRows, replyRows, myReactionRows] = uniqueThoughtIds.length
      ? await Promise.all([
          db.watchingThoughtReaction.findMany({
            where: { thoughtId: { in: uniqueThoughtIds } },
            select: { thoughtId: true },
          }),
          db.watchingThoughtReply.findMany({
            where: { thoughtId: { in: uniqueThoughtIds } },
            select: { thoughtId: true },
          }),
          db.watchingThoughtReaction.findMany({
            where: { thoughtId: { in: uniqueThoughtIds }, userId: currentUser.id },
            select: { thoughtId: true, reactionType: true },
          }),
        ])
      : [[], [], []];

    const reactionCountMap = new Map<string, number>();
    for (const row of reactionRows) {
      reactionCountMap.set(row.thoughtId, (reactionCountMap.get(row.thoughtId) ?? 0) + 1);
    }

    const replyCountMap = new Map<string, number>();
    for (const row of replyRows) {
      replyCountMap.set(row.thoughtId, (replyCountMap.get(row.thoughtId) ?? 0) + 1);
    }

    const myReactionsMap = new Map<string, string[]>();
    for (const row of myReactionRows) {
      const list = myReactionsMap.get(row.thoughtId) ?? [];
      list.push(row.reactionType);
      myReactionsMap.set(row.thoughtId, list);
    }

    const currentSession = currentSessionRaw
      ? toSessionDTO(currentSessionRaw, metadataByTitle, reactionCountMap, replyCountMap, myReactionsMap)
      : null;
    const watchingNow = watchingNowRaw.map((session) =>
      toSessionDTO(session, metadataByTitle, reactionCountMap, replyCountMap, myReactionsMap)
    );
    const justFinished = justFinishedRaw.map((session) =>
      toSessionDTO(session, metadataByTitle, reactionCountMap, replyCountMap, myReactionsMap)
    );

    const alsoWatchingCurrent = currentSession
      ? watchingNow.filter(
          (s) =>
            s.id !== currentSession.id &&
            s.tmdbId === currentSession.tmdbId &&
            s.mediaType === currentSession.mediaType
        )
      : [];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const trendingMap = new Map<
      string,
      {
        tmdbId: number;
        mediaType: "movie" | "tv";
        title: string;
        posterPath: string | null;
        releaseYear: number | null;
        watchingUserIds: Set<string>;
        watchedUserIds: Set<string>;
        watchingCount: number;
        watchedCount: number;
        totalCount: number;
      }
    >();
    for (const session of watchingNow) {
      if (session.status !== "WATCHING_NOW") continue;
      const key = `${session.mediaType}:${session.tmdbId}`;
      const prev = trendingMap.get(key);
      if (!prev) {
        trendingMap.set(key, {
          tmdbId: session.tmdbId,
          mediaType: session.mediaType,
          title: session.title,
          posterPath: session.posterPath,
          releaseYear: session.releaseYear,
          watchingUserIds: new Set([session.userId]),
          watchedUserIds: new Set(),
          watchingCount: 1,
          watchedCount: 0,
          totalCount: 1,
        });
      } else {
        prev.watchingUserIds.add(session.userId);
        prev.watchingCount = prev.watchingUserIds.size;
        prev.totalCount = prev.watchingUserIds.size + prev.watchedUserIds.size;
      }
    }
    for (const session of justFinished) {
      const endedAt = session.endedAt ? new Date(session.endedAt) : null;
      if (!endedAt || endedAt < startOfToday) continue;
      const key = `${session.mediaType}:${session.tmdbId}`;
      const prev = trendingMap.get(key);
      if (!prev) {
        trendingMap.set(key, {
          tmdbId: session.tmdbId,
          mediaType: session.mediaType,
          title: session.title,
          posterPath: session.posterPath,
          releaseYear: session.releaseYear,
          watchingUserIds: new Set(),
          watchedUserIds: new Set([session.userId]),
          watchingCount: 0,
          watchedCount: 1,
          totalCount: 1,
        });
      } else {
        prev.watchedUserIds.add(session.userId);
        prev.watchedCount = prev.watchedUserIds.size;
        prev.totalCount = prev.watchingUserIds.size + prev.watchedUserIds.size;
      }
    }
    const trendingTonight = Array.from(trendingMap.values())
      .map((entry) => ({
        tmdbId: entry.tmdbId,
        mediaType: entry.mediaType,
        title: entry.title,
        posterPath: entry.posterPath,
        releaseYear: entry.releaseYear,
        watchingCount: entry.watchingUserIds.size,
        watchedCount: entry.watchedUserIds.size,
        totalCount: entry.watchingUserIds.size + entry.watchedUserIds.size,
      }))
      .sort((a, b) => b.totalCount - a.totalCount || b.watchingCount - a.watchingCount || a.title.localeCompare(b.title))
      .slice(0, 5);

    return NextResponse.json({
      currentSession,
      watchingNow,
      justFinished,
      alsoWatchingCurrent,
      trendingTonight,
    });
  } catch (error) {
    console.error("watching GET error:", error);
    return NextResponse.json({ error: "Failed to load watching dashboard" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<{ session?: WatchingSessionDTO; success?: boolean; error?: string }>> {
  try {
    const authResult = await requireSignedInUser();
    if (isRequireUserFailure(authResult)) return authResult.response;
    const currentUser = authResult.user;
    const body = (await request.json()) as
      | {
          action: "start";
          tmdbId: number;
          mediaType: "movie" | "tv";
          title: string;
          posterPath?: string | null;
          backdropPath?: string | null;
          seasonNumber?: number | null;
          episodeNumber?: number | null;
          progressPercent?: number;
          visibility?: "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE";
        }
      | {
          action: "update_progress";
          sessionId: string;
          progressPercent: number;
        }
      | {
          action: "finish" | "stop" | "leave";
          sessionId: string;
          thought?: string;
          spoiler?: boolean;
        }
      | {
          action: "resume";
          sessionId: string;
        }
      | {
          action: "share_thought";
          sessionId?: string;
          tmdbId?: number;
          mediaType?: "movie" | "tv";
          title?: string;
          posterPath?: string | null;
          backdropPath?: string | null;
          seasonNumber?: number | null;
          episodeNumber?: number | null;
          content: string;
          spoiler?: boolean;
        };

    if (body.action === "start") {
      await autoTimeoutWatchingSessions([currentUser.id]);
      await db.watchingSession.updateMany({
        where: { userId: currentUser.id, status: "WATCHING_NOW" },
        data: { status: "STOPPED", endedAt: new Date() },
      });

      const created = await db.watchingSession.create({
        data: {
          userId: currentUser.id,
          tmdbId: body.tmdbId,
          mediaType: body.mediaType,
          title: body.title,
          posterPath: body.posterPath ?? null,
          backdropPath: body.backdropPath ?? null,
          seasonNumber: body.mediaType === "tv" && Number.isInteger(body.seasonNumber) ? body.seasonNumber : null,
          episodeNumber: body.mediaType === "tv" && Number.isInteger(body.episodeNumber) ? body.episodeNumber : null,
          progressPercent: body.progressPercent ?? null,
          visibility: body.visibility ?? "PUBLIC",
          status: "WATCHING_NOW",
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          thoughts: {
            include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      await Promise.all([
        triggerWatchingDashboardUpdated({ action: "start", userId: currentUser.id }),
        triggerWatchingTitleUpdated(created.mediaType as "movie" | "tv", created.tmdbId, {
          action: "start",
          userId: currentUser.id,
        }),
      ]);
      return NextResponse.json({ session: toSessionDTO(created) });
    }

    if (body.action === "update_progress") {
      const owned = await db.watchingSession.findFirst({
        where: { id: body.sessionId, userId: currentUser.id, status: "WATCHING_NOW" },
        select: { id: true },
      });
      if (!owned) return NextResponse.json({ error: "Active session not found" }, { status: 404 });

      const updated = await db.watchingSession.update({
        where: { id: body.sessionId },
        data: { progressPercent: Math.max(0, Math.min(100, body.progressPercent)) },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          thoughts: {
            include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      await Promise.all([
        triggerWatchingDashboardUpdated({ action: "update_progress", userId: currentUser.id }),
        triggerWatchingTitleUpdated(updated.mediaType as "movie" | "tv", updated.tmdbId, {
          action: "update_progress",
          userId: currentUser.id,
        }),
      ]);
      return NextResponse.json({ session: toSessionDTO(updated) });
    }

    if (body.action === "share_thought") {
      if (!body.content.trim()) {
        return NextResponse.json({ error: "Thought content is required" }, { status: 400 });
      }

      const moderation = moderateWatchingThoughtContent(body.content);
      if (!moderation.allowed) {
        return NextResponse.json({ error: moderation.error || "Thought does not meet content guidelines." }, { status: 400 });
      }

      await autoTimeoutWatchingSessions([currentUser.id]);

      type SessionPick = { id: string; tmdbId: number; mediaType: string };
      let session: SessionPick | null = null;

      if (body.sessionId?.trim()) {
        session = await db.watchingSession.findFirst({
          where: {
            id: body.sessionId,
            userId: currentUser.id,
            status: { in: ["WATCHING_NOW", "JUST_FINISHED", "STOPPED"] },
          },
          select: { id: true, tmdbId: true, mediaType: true },
        });
      }

      const wantsTitle =
        typeof body.tmdbId === "number" &&
        body.tmdbId > 0 &&
        (body.mediaType === "movie" || body.mediaType === "tv");

      if (!session && wantsTitle && body.mediaType) {
        const tmdbId = body.tmdbId;
        const mediaType = body.mediaType;
        const sn =
          mediaType === "tv" && typeof body.seasonNumber === "number" && Number.isInteger(body.seasonNumber)
            ? body.seasonNumber
            : null;
        const en =
          mediaType === "tv" && typeof body.episodeNumber === "number" && Number.isInteger(body.episodeNumber)
            ? body.episodeNumber
            : null;

        const tvEpisodeSpecific = mediaType === "tv" && sn != null && en != null;

        if (tvEpisodeSpecific) {
          session = await db.watchingSession.findFirst({
            where: {
              userId: currentUser.id,
              tmdbId,
              mediaType,
              seasonNumber: sn,
              episodeNumber: en,
            },
            orderBy: { startedAt: "desc" },
            select: { id: true, tmdbId: true, mediaType: true },
          });
        }

        if (!session && !tvEpisodeSpecific) {
          session = await db.watchingSession.findFirst({
            where: { userId: currentUser.id, tmdbId, mediaType },
            orderBy: { startedAt: "desc" },
            select: { id: true, tmdbId: true, mediaType: true },
          });
        }
      }

      if (!session && wantsTitle && body.title?.trim()) {
        const tmdbId = body.tmdbId;
        const mediaType = body.mediaType;
        const created = await db.watchingSession.create({
          data: {
            userId: currentUser.id,
            tmdbId,
            mediaType,
            title: body.title.trim(),
            posterPath: body.posterPath ?? null,
            backdropPath: body.backdropPath ?? null,
            seasonNumber:
              mediaType === "tv" && typeof body.seasonNumber === "number" && Number.isInteger(body.seasonNumber)
                ? body.seasonNumber
                : null,
            episodeNumber:
              mediaType === "tv" && typeof body.episodeNumber === "number" && Number.isInteger(body.episodeNumber)
                ? body.episodeNumber
                : null,
            status: "JUST_FINISHED",
            endedAt: new Date(),
            visibility: "PUBLIC",
          },
          select: { id: true, tmdbId: true, mediaType: true },
        });
        session = created;
      }

      if (!session) {
        return NextResponse.json(
          { error: "Could not attach a discussion to your account for this title." },
          { status: 400 }
        );
      }

      await db.watchingThought.create({
        data: {
          sessionId: session.id,
          userId: currentUser.id,
          content: moderation.sanitized || body.content.trim(),
          isSpoiler: Boolean(body.spoiler),
        },
      });
      await Promise.all([
        triggerWatchingDashboardUpdated({ action: "share_thought", userId: currentUser.id }),
        triggerWatchingTitleUpdated(session.mediaType as "movie" | "tv", session.tmdbId, {
          action: "share_thought",
          userId: currentUser.id,
        }),
      ]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "finish" || body.action === "stop" || body.action === "leave") {
      const owned = await db.watchingSession.findFirst({
        where: { id: body.sessionId, userId: currentUser.id },
        select: { id: true },
      });
      if (!owned) return NextResponse.json({ error: "Session not found" }, { status: 404 });

      const nextStatus = body.action === "finish" ? "JUST_FINISHED" : "STOPPED";
      const updated = await db.watchingSession.update({
        where: { id: body.sessionId },
        data: {
          status: nextStatus,
          endedAt: body.action === "stop" ? null : new Date(),
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          thoughts: {
            include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (body.thought?.trim()) {
        const moderation = moderateWatchingThoughtContent(body.thought);
        if (!moderation.allowed) {
          return NextResponse.json({ error: moderation.error || "Thought does not meet content guidelines." }, { status: 400 });
        }

        await db.watchingThought.create({
          data: {
            sessionId: updated.id,
            userId: currentUser.id,
            content: moderation.sanitized || body.thought.trim(),
            isSpoiler: Boolean(body.spoiler),
          },
        });
      }
      if (nextStatus === "JUST_FINISHED") {
        const finishedAt = updated.endedAt ?? new Date();
        const finishedSession: WatchedUpsertSession = {
          userId: updated.userId,
          tmdbId: updated.tmdbId,
          mediaType: updated.mediaType,
          title: updated.title,
          posterPath: updated.posterPath ?? null,
          backdropPath: updated.backdropPath ?? null,
          seasonNumber: updated.seasonNumber ?? null,
          episodeNumber: updated.episodeNumber ?? null,
        };
        await upsertWatchedTitle(finishedSession, "watching_finish", finishedAt);
        await syncEpisodeViewingFromSession(finishedSession, finishedAt);
      }
      await Promise.all([
        triggerWatchingDashboardUpdated({ action: body.action, userId: currentUser.id }),
        triggerWatchingTitleUpdated(updated.mediaType as "movie" | "tv", updated.tmdbId, {
          action: body.action,
          userId: currentUser.id,
        }),
      ]);
      return NextResponse.json({ session: toSessionDTO(updated) });
    }

    if (body.action === "resume") {
      const owned = await db.watchingSession.findFirst({
        where: { id: body.sessionId, userId: currentUser.id, status: "STOPPED", endedAt: null },
        select: { id: true },
      });
      if (!owned) return NextResponse.json({ error: "Paused session not found" }, { status: 404 });

      const updated = await db.watchingSession.update({
        where: { id: body.sessionId },
        data: { status: "WATCHING_NOW", endedAt: null },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          thoughts: {
            include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      await Promise.all([
        triggerWatchingDashboardUpdated({ action: "resume", userId: currentUser.id }),
        triggerWatchingTitleUpdated(updated.mediaType as "movie" | "tv", updated.tmdbId, {
          action: "resume",
          userId: currentUser.id,
        }),
      ]);
      return NextResponse.json({ session: toSessionDTO(updated) });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("watching POST error:", error);
    return NextResponse.json({ error: "Failed to update watching state" }, { status: 500 });
  }
}

