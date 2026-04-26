import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest
): Promise<NextResponse<{ isWatched: boolean; logId: string | null } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tmdbIdParam = searchParams.get("tmdbId");
    const mediaTypeParam = searchParams.get("mediaType");

    if (!tmdbIdParam || !mediaTypeParam) {
      return NextResponse.json({ error: "tmdbId and mediaType are required" }, { status: 400 });
    }

    const tmdbId = Number(tmdbIdParam);
    if (!Number.isFinite(tmdbId)) {
      return NextResponse.json({ error: "Invalid tmdbId" }, { status: 400 });
    }

    const mediaType = mediaTypeParam === "movie" || mediaTypeParam === "tv" ? mediaTypeParam : null;
    if (!mediaType) {
      return NextResponse.json({ error: "Invalid mediaType" }, { status: 400 });
    }

    let watchedTitle = await db.watchedTitle.findUnique({
      where: {
        userId_tmdbId_mediaType: {
          userId: user.id,
          tmdbId,
          mediaType,
        },
      },
      select: { id: true },
    });

    // Backfill legacy accounts where logs exist but watched_title row wasn't created.
    if (!watchedTitle) {
      const latestLog = await db.viewingLog.findFirst({
        where: {
          userId: user.id,
          tmdbId,
          mediaType,
        },
        orderBy: { watchedAt: "desc" },
      });

      if (latestLog) {
        watchedTitle = await db.watchedTitle.create({
          data: {
            userId: user.id,
            tmdbId,
            mediaType,
            title: latestLog.title,
            posterPath: latestLog.posterPath,
            backdropPath: latestLog.backdropPath,
            seenAt: latestLog.watchedAt,
            source: "diary_log",
          },
          select: { id: true },
        });
      }
    }

    return NextResponse.json({
      isWatched: Boolean(watchedTitle),
      logId: watchedTitle?.id ?? null,
    });
  } catch (error) {
    console.error("watched titles check GET error:", error);
    return NextResponse.json({ error: "Failed to check watched status" }, { status: 500 });
  }
}
