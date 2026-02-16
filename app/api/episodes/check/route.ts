import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Check if episodes are seen
export async function GET(request: NextRequest): Promise<NextResponse<{ seenEpisodes: number[] } | { error: string }>> {
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
    const tvShowTmdbId = searchParams.get("tvShowTmdbId");

    if (!tvShowTmdbId) {
      return NextResponse.json(
        { error: "tvShowTmdbId is required" },
        { status: 400 }
      );
    }

    const seenEpisodes = await db.episodeViewingLog.findMany({
      where: {
        userId: user.id,
        tvShowTmdbId: parseInt(tvShowTmdbId, 10),
      },
      select: {
        episodeId: true,
      },
    });

    return NextResponse.json({
      seenEpisodes: seenEpisodes.map((e) => e.episodeId),
    });
  } catch (error) {
    console.error("Check episodes seen API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to check episodes seen";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
