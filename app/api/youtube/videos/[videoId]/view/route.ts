import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Track YouTube video view
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    const { videoId } = await params;

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    let user = null;
    if (clerkUserId) {
      user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
    }

    const body = await request.json();
    const {
      channelId,
      viewDuration,
      completed = false,
      source,
      liked = false,
      addedToWatchlist = false,
      addedToPlaylist = false,
    } = body;

    if (!channelId) {
      return NextResponse.json(
        { error: "Channel ID is required" },
        { status: 400 }
      );
    }

    // Fetch video category from YouTube API if available
    let categoryId: string | undefined;
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (YOUTUBE_API_KEY) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${YOUTUBE_API_KEY}`,
          { next: { revalidate: 3600 } } // Cache for 1 hour
        );
        if (response.ok) {
          const data = await response.json();
          if (data.items?.[0]?.snippet?.categoryId) {
            categoryId = data.items[0].snippet.categoryId;
          }
        }
      } catch (error) {
        // Silently fail - category is optional
        console.error("Error fetching video category:", error);
      }
    }

    // Create or update view record
    const view = await db.youTubeVideoView.create({
      data: {
        userId: user?.id,
        videoId,
        channelId,
        categoryId,
        viewDuration,
        completed,
        source,
        liked,
        addedToWatchlist,
        addedToPlaylist,
      },
    });

    return NextResponse.json({ view });
  } catch (error) {
    console.error("Error tracking view:", error);
    return NextResponse.json(
      { error: "Failed to track view" },
      { status: 500 }
    );
  }
}

