import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

async function resolveUserId() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function GET(_request: NextRequest): Promise<NextResponse<{ titles: unknown[] } | { error: string }>> {
  try {
    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [watchedTitles, diaryLogs] = await Promise.all([
      db.watchedTitle.findMany({
        where: { userId },
        orderBy: { seenAt: "desc" },
      }),
      db.viewingLog.findMany({
        where: { userId },
        orderBy: { watchedAt: "desc" },
        select: {
          tmdbId: true,
          mediaType: true,
          title: true,
          posterPath: true,
          backdropPath: true,
          watchedAt: true,
        },
      }),
    ]);

    // Logged titles are always watched. Merge both sources and keep latest seenAt.
    const merged = new Map<
      string,
      {
        id: string;
        userId: string;
        tmdbId: number;
        mediaType: string;
        title: string;
        posterPath: string | null;
        backdropPath: string | null;
        seenAt: Date;
        source: string | null;
        createdAt: Date;
        updatedAt: Date;
      }
    >();

    for (const row of watchedTitles) {
      const key = `${row.tmdbId}:${row.mediaType}`;
      merged.set(key, {
        id: row.id,
        userId: row.userId,
        tmdbId: row.tmdbId,
        mediaType: row.mediaType,
        title: row.title,
        posterPath: row.posterPath ?? null,
        backdropPath: row.backdropPath ?? null,
        seenAt: row.seenAt,
        source: row.source ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }

    for (const log of diaryLogs) {
      const key = `${log.tmdbId}:${log.mediaType}`;
      const existing = merged.get(key);
      if (!existing || existing.seenAt.getTime() < log.watchedAt.getTime()) {
        merged.set(key, {
          id: existing?.id ?? `diary-${userId}-${log.tmdbId}-${log.mediaType}`,
          userId,
          tmdbId: log.tmdbId,
          mediaType: log.mediaType,
          title: log.title,
          posterPath: log.posterPath ?? null,
          backdropPath: log.backdropPath ?? null,
          seenAt: log.watchedAt,
          source: existing?.source ?? "diary_log",
          createdAt: existing?.createdAt ?? log.watchedAt,
          updatedAt: existing?.updatedAt ?? log.watchedAt,
        });
      }
    }

    const titles = Array.from(merged.values()).sort(
      (a, b) => b.seenAt.getTime() - a.seenAt.getTime()
    );

    return NextResponse.json({ titles });
  } catch (error) {
    console.error("watched titles GET error:", error);
    return NextResponse.json({ error: "Failed to fetch watched titles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean; title?: unknown } | { error: string }>> {
  try {
    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tmdbId, mediaType, title, posterPath, backdropPath, seenAt, source } = body ?? {};

    if (!tmdbId || !mediaType || !title) {
      return NextResponse.json(
        { error: "Missing required fields: tmdbId, mediaType, title" },
        { status: 400 }
      );
    }

    const normalizedMediaType = mediaType === "tv" ? "tv" : mediaType === "movie" ? "movie" : null;
    if (!normalizedMediaType) {
      return NextResponse.json({ error: "Invalid mediaType" }, { status: 400 });
    }

    const watchedTitle = await db.watchedTitle.upsert({
      where: {
        userId_tmdbId_mediaType: {
          userId,
          tmdbId: Number(tmdbId),
          mediaType: normalizedMediaType,
        },
      },
      create: {
        userId,
        tmdbId: Number(tmdbId),
        mediaType: normalizedMediaType,
        title,
        posterPath: posterPath ?? null,
        backdropPath: backdropPath ?? null,
        seenAt: seenAt ? new Date(seenAt) : new Date(),
        source: source ?? "manual_seen",
      },
      update: {
        title,
        posterPath: posterPath ?? null,
        backdropPath: backdropPath ?? null,
        seenAt: seenAt ? new Date(seenAt) : new Date(),
        source: source ?? "manual_seen",
      },
    });

    return NextResponse.json({ success: true, title: watchedTitle });
  } catch (error) {
    console.error("watched titles POST error:", error);
    return NextResponse.json({ error: "Failed to mark title as watched" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const watchedTitleId = searchParams.get("id");

    if (!watchedTitleId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await db.watchedTitle.deleteMany({
      where: {
        id: watchedTitleId,
        userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("watched titles DELETE error:", error);
    return NextResponse.json({ error: "Failed to unwatch title" }, { status: 500 });
  }
}
