import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Get all active YouTube channel IDs from database
 * Filters out private channels unless they belong to the current user
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
      isActive: true,
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

