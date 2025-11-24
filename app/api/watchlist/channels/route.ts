import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Add a YouTube channel to watchlist
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { channelId } = body;

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

    // Check if already in watchlist
    const existing = await db.channelWatchlistItem.findUnique({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Channel already in watchlist", item: existing },
        { status: 400 }
      );
    }

    // Fetch channel details from YouTube API to cache
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    let channelTitle: string | undefined;
    let channelThumbnail: string | undefined;
    let channelUrl: string | undefined;

    if (YOUTUBE_API_KEY) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?id=${channelId}&part=snippet&key=${YOUTUBE_API_KEY}`,
          { next: { revalidate: 3600 } }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.items?.[0]) {
            const item = data.items[0];
            channelTitle = item.snippet.title;
            channelThumbnail = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url;
            channelUrl = `https://www.youtube.com/${item.snippet.customUrl || `channel/${item.id}`}`;
          }
        }
      } catch (error) {
        console.error("Error fetching channel details:", error);
        // Continue without cached data
      }
    }

    const channelRecord = await db.youTubeChannel.findUnique({
      where: { channelId },
      select: { slug: true },
    });

    // Add to watchlist
    const watchlistItem = await db.channelWatchlistItem.create({
      data: {
        userId: user.id,
        channelId,
        slug: channelRecord?.slug,
        title: channelTitle,
        thumbnail: channelThumbnail,
        channelUrl,
      },
    });

    return NextResponse.json({
      success: true,
      item: watchlistItem,
    });
  } catch (error) {
    console.error("Error adding channel to watchlist:", error);
    return NextResponse.json(
      { error: "Failed to add channel to watchlist" },
      { status: 500 }
    );
  }
}

/**
 * Get user's channel watchlist
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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

    // Get channel watchlist items
    const items = await db.channelWatchlistItem.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      items,
    });
  } catch (error) {
    console.error("Error fetching channel watchlist:", error);
    return NextResponse.json(
      { error: "Failed to fetch channel watchlist" },
      { status: 500 }
    );
  }
}

