import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Check if channel IDs exist in the database (regardless of privacy)
 * Used by the extractor tool to show which channels are already added
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelIds } = body;

    if (!Array.isArray(channelIds) || channelIds.length === 0) {
      return NextResponse.json({ existingIds: [] });
    }

    // Check all channels regardless of privacy/active status
    // This is just to check existence, not for display
    const existingChannels = await db.youTubeChannel.findMany({
      where: {
        channelId: {
          in: channelIds,
        },
      },
      select: {
        channelId: true,
      },
    });

    const existingIds = existingChannels.map((channel) => channel.channelId);

    return NextResponse.json({ existingIds });
  } catch (error) {
    console.error("[YouTube Channels Check API] Error:", error);
    return NextResponse.json(
      { error: "Failed to check channels", existingIds: [] },
      { status: 500 }
    );
  }
}

