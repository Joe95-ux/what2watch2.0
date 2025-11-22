import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Get all active YouTube channel IDs from database
 */
export async function GET(request: NextRequest) {
  try {
    const channels = await db.youTubeChannel.findMany({
      where: {
        isActive: true,
      },
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

