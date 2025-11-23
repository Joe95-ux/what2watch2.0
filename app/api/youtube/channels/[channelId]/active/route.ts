import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Toggle the active status of a YouTube channel (hide/show on website)
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
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean" },
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

    // Update channel active status
    const updated = await db.youTubeChannel.update({
      where: { channelId },
      data: {
        isActive,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Channel ${isActive ? "activated" : "deactivated"}`,
      channel: {
        channelId: updated.channelId,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error("[Update Channel Active Status API] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to update channel active status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

