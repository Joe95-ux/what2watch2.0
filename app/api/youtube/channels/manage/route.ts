import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Get all YouTube channels for management (including inactive and private)
 */
export async function GET(request: NextRequest) {
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
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get all channels (for management, we show all)
    const channels = await db.youTubeChannel.findMany({
      orderBy: [
        { isActive: "desc" },
        { order: "asc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        channelId: true,
        title: true,
        thumbnail: true,
        channelUrl: true,
        isActive: true,
        isPrivate: true,
        addedByUserId: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      channels,
      total: channels.length,
    });
  } catch (error) {
    console.error("[Get Channels for Management API] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch channels",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

