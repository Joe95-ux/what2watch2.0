import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(_request: NextRequest): Promise<NextResponse<{ titles: unknown[] } | { error: string }>> {
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

    const [watchedTitles, diaryLogs] = await Promise.all([
      db.watchedTitle.findMany({
        where: { userId: user.id },
        orderBy: { seenAt: "desc" },
      }),
      db.viewingLog.findMany({
        where: { userId: user.id },
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
          id: existing?.id ?? `diary-${user.id}-${log.tmdbId}-${log.mediaType}`,
          userId: user.id,
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
