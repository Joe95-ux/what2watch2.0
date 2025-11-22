import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Get all YouTube channel IDs from database
 * Filters out private channels unless they belong to the current user
 * Visibility is controlled by isPrivate flag only
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    // Get user from database if authenticated
    let user = null;
    if (userId) {
      user = await db.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      });
    }

    // Build where clause: show public channels OR private channels owned by current user
    // Only filter by privacy - isActive is not needed for visibility control
    const orConditions: Prisma.YouTubeChannelWhereInput[] = [
      { isPrivate: false }, // Public channels
    ];

    // If user is authenticated, also include their private channels
    if (user) {
      orConditions.push({
        isPrivate: true,
        addedByUserId: user.id,
      });
    }

    const whereClause: Prisma.YouTubeChannelWhereInput = {
      OR: orConditions,
    };

    const channels = await db.youTubeChannel.findMany({
      where: whereClause,
      orderBy: {
        order: "asc",
      },
      select: {
        channelId: true,
      },
    });

    // Debug logging
    console.log("[YouTube Channels List API] Query result:", {
      totalChannels: channels.length,
      userId: user?.id || "not authenticated",
      whereClause,
    });

    const channelIds = channels.map((channel) => channel.channelId);

    return NextResponse.json(
      { channelIds },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error("[YouTube Channels List API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch channel IDs", channelIds: [] },
      { status: 500 }
    );
  }
}

