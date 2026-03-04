import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// PATCH - Update multiple episode viewing logs by date/season (for grouped episodes)
export async function PATCH(
  request: NextRequest
): Promise<NextResponse<{ success: boolean; updatedCount: number } | { error: string }>> {
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

    const body = await request.json();
    const { tvShowTmdbId, seasonNumber, oldDate, newDate } = body;

    if (!tvShowTmdbId || seasonNumber === undefined || !oldDate || !newDate) {
      return NextResponse.json(
        { error: "tvShowTmdbId, seasonNumber, oldDate, and newDate are required" },
        { status: 400 }
      );
    }

    const oldDateObj = new Date(oldDate);
    const newDateObj = new Date(newDate);

    // Create date range for the old date (start and end of day)
    const startOfDay = new Date(oldDateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(oldDateObj);
    endOfDay.setHours(23, 59, 59, 999);

    // Find all episode logs for this TV show, season, and date
    const episodeLogs = await db.episodeViewingLog.findMany({
      where: {
        userId: user.id,
        tvShowTmdbId: Number(tvShowTmdbId),
        seasonNumber: Number(seasonNumber),
        watchedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { id: true },
    });

    if (episodeLogs.length === 0) {
      return NextResponse.json({ error: "No episode logs found" }, { status: 404 });
    }

    // Update all matching episode logs
    const result = await db.episodeViewingLog.updateMany({
      where: {
        id: { in: episodeLogs.map((log) => log.id) },
      },
      data: {
        watchedAt: newDateObj,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("[EpisodeViewingLog Batch Update] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update episode viewing logs" },
      { status: 500 }
    );
  }
}
