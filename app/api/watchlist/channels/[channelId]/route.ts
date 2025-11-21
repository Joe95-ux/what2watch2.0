import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Remove a YouTube channel from watchlist
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { channelId } = await params;

    if (!channelId) {
      return NextResponse.json(
        { error: "channelId is required" },
        { status: 400 }
      );
    }

    // Get current user
    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Delete from watchlist
    await db.channelWatchlistItem.delete({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Channel removed from watchlist",
    });
  } catch (error) {
    console.error("Error removing channel from watchlist:", error);
    // If not found, that's okay - already removed
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json({
        success: true,
        message: "Channel already removed from watchlist",
      });
    }
    return NextResponse.json(
      { error: "Failed to remove channel from watchlist" },
      { status: 500 }
    );
  }
}

