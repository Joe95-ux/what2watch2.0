import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Fetch a viewing log by username and film title (public)
export async function GET(request: NextRequest): Promise<NextResponse<{ log: unknown; user: unknown } | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const tmdbId = searchParams.get("tmdbId");
    const mediaType = searchParams.get("mediaType");
    const logId = searchParams.get("logId");

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // Find user by username
    const user = await db.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the viewing log
    let log;
    if (logId) {
      // If logId is provided, use it directly
      log = await db.viewingLog.findFirst({
        where: {
          id: logId,
          userId: user.id,
        },
      });
    } else if (tmdbId && mediaType) {
      // Otherwise, find by tmdbId and mediaType (get the most recent one)
      log = await db.viewingLog.findFirst({
        where: {
          userId: user.id,
          tmdbId: parseInt(tmdbId, 10),
          mediaType: mediaType as "movie" | "tv",
        },
        orderBy: {
          watchedAt: "desc",
        },
      });
    } else {
      return NextResponse.json({ error: "tmdbId and mediaType or logId is required" }, { status: 400 });
    }

    if (!log) {
      return NextResponse.json({ error: "Viewing log not found" }, { status: 404 });
    }

    return NextResponse.json({ log, user });
  } catch (error) {
    console.error("Get public viewing log API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch viewing log";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

