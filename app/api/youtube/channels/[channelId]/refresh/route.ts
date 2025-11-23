import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Refresh channel details from YouTube API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { channelId } = await params;

    // Check if channel exists
    const existing = await db.youTubeChannel.findUnique({
      where: { channelId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    // Fetch channel details from YouTube API
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    const youtubeResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?id=${channelId}&part=snippet&key=${YOUTUBE_API_KEY}`,
      {
        next: { revalidate: 3600 },
      }
    );

    if (!youtubeResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch channel details from YouTube" },
        { status: youtubeResponse.status }
      );
    }

    const youtubeData = await youtubeResponse.json();
    if (!youtubeData.items || youtubeData.items.length === 0) {
      return NextResponse.json(
        { error: "Channel not found on YouTube" },
        { status: 404 }
      );
    }

    const item = youtubeData.items[0];
    const channelTitle = item.snippet?.title || null;
    const channelThumbnail = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || null;
    const customUrl = item.snippet?.customUrl;
    const channelUrl = customUrl 
      ? `https://www.youtube.com/${customUrl}`
      : `https://www.youtube.com/channel/${channelId}`;

    // Update channel in database
    const updated = await db.youTubeChannel.update({
      where: { channelId },
      data: {
        title: channelTitle,
        thumbnail: channelThumbnail,
        channelUrl: channelUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Channel details refreshed",
      channel: {
        channelId: updated.channelId,
        title: updated.title,
        thumbnail: updated.thumbnail,
        channelUrl: updated.channelUrl,
      },
    });
  } catch (error) {
    console.error("[Refresh Channel Details API] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to refresh channel details",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

