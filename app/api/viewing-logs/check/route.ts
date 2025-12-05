import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Check if a film is watched (has a viewing log)
export async function GET(request: NextRequest): Promise<NextResponse<{ isWatched: boolean; logId: string | null } | { error: string }>> {
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
    const tmdbId = searchParams.get("tmdbId");
    const mediaType = searchParams.get("mediaType");

    if (!tmdbId || !mediaType) {
      return NextResponse.json(
        { error: "tmdbId and mediaType are required" },
        { status: 400 }
      );
    }

    // Find the most recent log for this film
    const log = await db.viewingLog.findFirst({
      where: {
        userId: user.id,
        tmdbId: parseInt(tmdbId, 10),
        mediaType: mediaType as "movie" | "tv",
      },
      orderBy: {
        watchedAt: "desc",
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      isWatched: !!log,
      logId: log?.id || null,
    });
  } catch (error) {
    console.error("Check watched status API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to check watched status";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

