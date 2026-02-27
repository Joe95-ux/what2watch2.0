import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch all viewing logs for a specific movie/TV show
export async function GET(request: NextRequest): Promise<NextResponse<{ logs: unknown[] } | { error: string }>> {
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
      return NextResponse.json({ error: "tmdbId and mediaType are required" }, { status: 400 });
    }

    const logs = await db.viewingLog.findMany({
      where: {
        userId: user.id,
        tmdbId: parseInt(tmdbId, 10),
        mediaType: mediaType as "movie" | "tv",
      },
      orderBy: {
        watchedAt: "desc",
      },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Get viewing logs by content API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch viewing logs";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
