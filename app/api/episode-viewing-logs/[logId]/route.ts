import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// PATCH - Update an episode viewing log entry (e.g., update watched date)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
): Promise<NextResponse<{ success: boolean; log?: unknown } | { error: string }>> {
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

    const { logId } = await params;
    const body = await request.json();

    // Verify the log belongs to the user
    const existingLog = await db.episodeViewingLog.findUnique({
      where: { id: logId },
      select: { userId: true },
    });

    if (!existingLog) {
      return NextResponse.json({ error: "Episode viewing log not found" }, { status: 404 });
    }

    if (existingLog.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prepare update data
    const updateData: {
      watchedAt?: Date;
    } = {};

    if (body.watchedAt) {
      updateData.watchedAt = new Date(body.watchedAt);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Update the episode viewing log
    const updatedLog = await db.episodeViewingLog.update({
      where: { id: logId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      log: {
        id: updatedLog.id,
        watchedAt: updatedLog.watchedAt.toISOString(),
        episodeId: updatedLog.episodeId,
        seasonNumber: updatedLog.seasonNumber,
        episodeNumber: updatedLog.episodeNumber,
      },
    });
  } catch (error) {
    console.error("[EpisodeViewingLog PATCH] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update episode viewing log" },
      { status: 500 }
    );
  }
}
