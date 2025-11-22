import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Like/Favorite a YouTube channel
 */
export async function POST(
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

    // Check if already favorited
    const existing = await db.favoriteChannel.findUnique({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Channel already favorited", favorite: existing },
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

    // Create favorite
    const favorite = await db.favoriteChannel.create({
      data: {
        userId: user.id,
        channelId,
        title: channelTitle,
        thumbnail: channelThumbnail,
        channelUrl,
      },
    });

    // Also add to watchlist if not already there
    try {
      const existingWatchlistItem = await db.channelWatchlistItem.findUnique({
        where: {
          userId_channelId: {
            userId: user.id,
            channelId,
          },
        },
      });

      if (!existingWatchlistItem) {
        await db.channelWatchlistItem.create({
          data: {
            userId: user.id,
            channelId,
            title: channelTitle,
            thumbnail: channelThumbnail,
            channelUrl,
          },
        });
      }
    } catch (watchlistError) {
      // Log but don't fail the favorite operation if watchlist add fails
      console.error("Error adding channel to watchlist after favoriting:", watchlistError);
    }

    return NextResponse.json({
      success: true,
      favorite,
    });
  } catch (error) {
    console.error("Error favoriting channel:", error);
    return NextResponse.json(
      { error: "Failed to favorite channel" },
      { status: 500 }
    );
  }
}

/**
 * Unlike/Unfavorite a YouTube channel
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

    // Delete favorite
    await db.favoriteChannel.delete({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Channel unfavorited",
    });
  } catch (error) {
    console.error("Error unfavoriting channel:", error);
    // If not found, that's okay - already unfavorited
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json({
        success: true,
        message: "Channel already unfavorited",
      });
    }
    return NextResponse.json(
      { error: "Failed to unfavorite channel" },
      { status: 500 }
    );
  }
}

