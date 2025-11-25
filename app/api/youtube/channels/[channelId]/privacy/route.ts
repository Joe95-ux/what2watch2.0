import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Update the privacy status of a YouTube channel
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the user from database
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { channelId } = await params;
    const body = await request.json();
    const { isPrivate } = body;

    if (typeof isPrivate !== "boolean") {
      return NextResponse.json(
        { error: "isPrivate must be a boolean" },
        { status: 400 }
      );
    }

    // Check if channel exists
    const existing = await db.youTubeChannel.findUnique({
      where: { channelId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    if (existing.addedByUserId !== user.id) {
      return NextResponse.json(
        { error: "You can only update channels you added" },
        { status: 403 }
      );
    }

    // Update channel privacy
    const updated = await db.youTubeChannel.update({
      where: { channelId },
      data: {
        isPrivate,
        addedByUserId: existing.addedByUserId || user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Channel marked as ${isPrivate ? "private" : "public"}`,
      channel: {
        channelId: updated.channelId,
        isPrivate: updated.isPrivate,
      },
    });
  } catch (error) {
    console.error("[Update Channel Privacy API] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to update channel privacy",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

