import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { ActivityType, Prisma } from "@prisma/client";

const DIARY_ACTIVITY_TYPES: ActivityType[] = ["LOGGED_FILM", "REVIEWED_FILM", "RATED_FILM"];

function pickCanonicalActivityId(
  activities: { id: string; type: ActivityType }[]
): string | null {
  const logged = activities.find((a) => a.type === "LOGGED_FILM");
  if (logged) return logged.id;
  const reviewed = activities.find((a) => a.type === "REVIEWED_FILM");
  if (reviewed) return reviewed.id;
  const rated = activities.find((a) => a.type === "RATED_FILM");
  if (rated) return rated.id;
  return activities[0]?.id ?? null;
}

async function findActivitiesForViewingLog(log: {
  id: string;
  userId: string;
  tmdbId: number;
  mediaType: string;
  createdAt: Date;
}) {
  let byMeta: {
    id: string;
    type: ActivityType;
    createdAt: Date;
    _count: { likes: number };
  }[] = [];

  try {
    byMeta = await db.activity.findMany({
      where: {
        userId: log.userId,
        metadata: {
          path: ["viewingLogId"],
          equals: log.id,
        } as Prisma.JsonNullableFilter,
      },
      select: {
        id: true,
        type: true,
        createdAt: true,
        _count: { select: { likes: true } },
      },
    });
  } catch {
    byMeta = [];
  }

  if (byMeta.length > 0) {
    return byMeta;
  }

  // Legacy: activities created before we stored viewingLogId on metadata
  const tolMs = 25_000;
  return db.activity.findMany({
    where: {
      userId: log.userId,
      tmdbId: log.tmdbId,
      mediaType: log.mediaType,
      type: { in: DIARY_ACTIVITY_TYPES },
      createdAt: {
        gte: new Date(log.createdAt.getTime() - tolMs),
        lte: new Date(log.createdAt.getTime() + tolMs),
      },
    },
    select: {
      id: true,
      type: true,
      createdAt: true,
      _count: { select: { likes: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

// GET — public like stats for a diary entry (activity feed likes)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const { logId } = await params;

    const log = await db.viewingLog.findUnique({
      where: { id: logId },
      select: {
        id: true,
        userId: true,
        tmdbId: true,
        mediaType: true,
        createdAt: true,
      },
    });

    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const activities = await findActivitiesForViewingLog(log);
    const activityIds = activities.map((a) => a.id);
    const likeCount = activities.reduce((sum, a) => sum + a._count.likes, 0);
    const canonicalActivityId = pickCanonicalActivityId(activities);

    let likedByMe = false;
    let likedActivityId: string | null = null;

    const { userId: clerkUserId } = await auth();
    if (clerkUserId && activityIds.length > 0) {
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
      if (user) {
        const like = await db.activityLike.findFirst({
          where: {
            userId: user.id,
            activityId: { in: activityIds },
          },
          select: { activityId: true },
        });
        if (like) {
          likedByMe = true;
          likedActivityId = like.activityId;
        }
      }
    }

    return NextResponse.json({
      likeCount,
      likedByMe,
      likedActivityId,
      primaryActivityId: canonicalActivityId,
    });
  } catch (error) {
    console.error("[viewing-logs activity-likes GET]", error);
    return NextResponse.json(
      { error: "Failed to load likes" },
      { status: 500 }
    );
  }
}
