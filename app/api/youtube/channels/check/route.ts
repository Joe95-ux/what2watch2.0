import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Check if channel IDs exist in the app pool and (when signed in) the user's feed.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelIds } = body;

    if (!Array.isArray(channelIds) || channelIds.length === 0) {
      return NextResponse.json({ existingIds: [], feedIds: [] });
    }

    const uniqueIds = [...new Set(channelIds.filter((id): id is string => typeof id === "string" && id.length > 0))];

    const existingChannels = await db.youTubeChannel.findMany({
      where: {
        channelId: {
          in: uniqueIds,
        },
      },
      select: {
        channelId: true,
      },
    });

    const existingIds = existingChannels.map((channel) => channel.channelId);

    let feedIds: string[] = [];
    const { userId: clerkUserId } = await auth();
    if (clerkUserId) {
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });

      if (user) {
        const feedChannels = await db.favoriteChannel.findMany({
          where: {
            userId: user.id,
            channelId: { in: uniqueIds },
          },
          select: { channelId: true },
        });
        feedIds = feedChannels.map((row) => row.channelId);
      }
    }

    return NextResponse.json({ existingIds, feedIds });
  } catch (error) {
    console.error("[YouTube Channels Check API] Error:", error);
    return NextResponse.json(
      { error: "Failed to check channels", existingIds: [], feedIds: [] },
      { status: 500 }
    );
  }
}
