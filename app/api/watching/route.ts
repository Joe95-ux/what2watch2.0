import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { WatchingDashboardResponse, WatchingSessionDTO, WatchingTitlePresenceResponse } from "@/lib/watching-types";

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

async function autoTimeoutWatchingSessions(userIds: string[]): Promise<void> {
  if (!userIds.length) return;
  const threshold = new Date(Date.now() - WATCHING_AUTO_TIMEOUT_MS);
  await db.watchingSession.updateMany({
    where: {
      userId: { in: userIds },
      status: "WATCHING_NOW",
      updatedAt: { lt: threshold },
    },
    data: {
      status: "STOPPED",
      endedAt: new Date(),
    },
  });
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
  }
): WatchingSessionDTO {
  return {
    id: session.id,
    userId: session.userId,
    tmdbId: session.tmdbId,
    mediaType: session.mediaType as "movie" | "tv",
    title: session.title,
    posterPath: session.posterPath,
    backdropPath: session.backdropPath,
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
            status: "JUST_FINISHED",
          },
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          session: { select: { id: true } },
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
            content: thought.content,
            createdAt: thought.createdAt.toISOString(),
            isSpoiler: false as const,
            reactionCount: reactionCountMap.get(thought.id) ?? 0,
            replyCount: replyCountMap.get(thought.id) ?? 0,
            myReactions: myReactionsMap.get(thought.id) ?? [],
            user: thought.user,
          })),
        spoilerThoughts: thoughts
          .filter((thought) => thought.isSpoiler)
          .slice(0, 12)
          .map((thought) => ({
            thoughtId: thought.id,
            sessionId: thought.session.id,
            content: thought.content,
            createdAt: thought.createdAt.toISOString(),
            isSpoiler: true as const,
            reactionCount: reactionCountMap.get(thought.id) ?? 0,
            replyCount: replyCountMap.get(thought.id) ?? 0,
            myReactions: myReactionsMap.get(thought.id) ?? [],
            user: thought.user,
          })),
      });
    }

    const authResult = await requireAdmin();
    if (isRequireAdminFailure(authResult)) return authResult.response;
    const currentUser = authResult.user;

    const followRows = await db.follow.findMany({
      where: { followerId: currentUser.id },
      select: { followingId: true },
    });
    const followingIds = followRows.map((f) => f.followingId);
    const networkIds = [currentUser.id, ...followingIds];
    await autoTimeoutWatchingSessions(networkIds);

    const [currentSessionRaw, watchingNowRaw, justFinishedRaw] = await Promise.all([
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
          status: "WATCHING_NOW",
          userId: { in: networkIds },
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
          createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 48) },
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

    const currentSession = currentSessionRaw ? toSessionDTO(currentSessionRaw) : null;
    const watchingNow = watchingNowRaw.map(toSessionDTO);
    const justFinished = justFinishedRaw.map(toSessionDTO);

    const alsoWatchingCurrent = currentSession
      ? watchingNow.filter(
          (s) =>
            s.id !== currentSession.id &&
            s.tmdbId === currentSession.tmdbId &&
            s.mediaType === currentSession.mediaType
        )
      : [];

    const trendingMap = new Map<string, { tmdbId: number; mediaType: "movie" | "tv"; title: string; posterPath: string | null; watchingCount: number }>();
    for (const session of watchingNow) {
      const key = `${session.mediaType}:${session.tmdbId}`;
      const prev = trendingMap.get(key);
      if (!prev) {
        trendingMap.set(key, {
          tmdbId: session.tmdbId,
          mediaType: session.mediaType,
          title: session.title,
          posterPath: session.posterPath,
          watchingCount: 1,
        });
      } else {
        prev.watchingCount += 1;
      }
    }
    const trendingTonight = Array.from(trendingMap.values())
      .sort((a, b) => b.watchingCount - a.watchingCount || a.title.localeCompare(b.title))
      .slice(0, 8);

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
          progressPercent?: number;
          visibility?: "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE";
        }
      | {
          action: "update_progress";
          sessionId: string;
          progressPercent: number;
        }
      | {
          action: "finish" | "stop";
          sessionId: string;
          thought?: string;
          spoiler?: boolean;
        }
      | {
          action: "share_thought";
          sessionId: string;
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
      return NextResponse.json({ session: toSessionDTO(updated) });
    }

    if (body.action === "share_thought") {
      const session = await db.watchingSession.findFirst({
        where: { id: body.sessionId, userId: currentUser.id, status: "WATCHING_NOW" },
        select: { id: true },
      });
      if (!session) return NextResponse.json({ error: "Active session not found" }, { status: 404 });

      if (!body.content.trim()) {
        return NextResponse.json({ error: "Thought content is required" }, { status: 400 });
      }

      await db.watchingThought.create({
        data: {
          sessionId: session.id,
          userId: currentUser.id,
          content: body.content.trim(),
          isSpoiler: Boolean(body.spoiler),
        },
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === "finish" || body.action === "stop") {
      const owned = await db.watchingSession.findFirst({
        where: { id: body.sessionId, userId: currentUser.id },
        select: { id: true },
      });
      if (!owned) return NextResponse.json({ error: "Session not found" }, { status: 404 });

      const nextStatus = body.action === "finish" ? "JUST_FINISHED" : "STOPPED";
      const updated = await db.watchingSession.update({
        where: { id: body.sessionId },
        data: { status: nextStatus, endedAt: new Date() },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          thoughts: {
            include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (body.thought?.trim()) {
        await db.watchingThought.create({
          data: {
            sessionId: updated.id,
            userId: currentUser.id,
            content: body.thought.trim(),
            isSpoiler: Boolean(body.spoiler),
          },
        });
      }
      return NextResponse.json({ session: toSessionDTO(updated) });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("watching POST error:", error);
    return NextResponse.json({ error: "Failed to update watching state" }, { status: 500 });
  }
}

