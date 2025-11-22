import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Add a YouTube video to a playlist
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { videoId } = await params;
    const body = await request.json();
    const { playlistId } = body;

    if (!playlistId) {
      return NextResponse.json(
        { error: "playlistId is required" },
        { status: 400 }
      );
    }

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId is required" },
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

    // Verify playlist belongs to user
    const playlist = await db.playlist.findFirst({
      where: {
        id: playlistId,
        userId: user.id,
      },
    });

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found or access denied" },
        { status: 404 }
      );
    }

    // Check if video already in playlist
    const existing = await db.youTubePlaylistItem.findUnique({
      where: {
        playlistId_videoId: {
          playlistId,
          videoId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Video already in playlist", item: existing },
        { status: 400 }
      );
    }

    // Get video details from YouTube API
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    let videoTitle: string = "YouTube Video";
    let videoThumbnail: string | undefined;
    let videoDescription: string | undefined;
    let videoDuration: string | undefined;
    let videoPublishedAt: string | undefined;
    let channelId: string | undefined;
    let channelTitle: string | undefined;

    if (YOUTUBE_API_KEY) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${YOUTUBE_API_KEY}`,
          { next: { revalidate: 3600 } }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.items?.[0]) {
            const item = data.items[0];
            videoTitle = item.snippet.title;
            videoThumbnail = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url;
            videoDescription = item.snippet.description;
            videoDuration = item.contentDetails?.duration;
            videoPublishedAt = item.snippet.publishedAt;
            channelId = item.snippet.channelId;
            channelTitle = item.snippet.channelTitle;
          }
        }
      } catch (error) {
        console.error("Error fetching video details:", error);
        // Continue with default values
      }
    }

    // Get max order in playlist
    const maxOrderItem = await db.youTubePlaylistItem.findFirst({
      where: { playlistId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = maxOrderItem ? maxOrderItem.order + 1 : 0;

    // Add video to playlist
    const playlistItem = await db.youTubePlaylistItem.create({
      data: {
        playlistId,
        videoId,
        title: videoTitle,
        thumbnail: videoThumbnail,
        description: videoDescription,
        duration: videoDuration,
        publishedAt: videoPublishedAt,
        channelId: channelId || "",
        channelTitle,
        order: nextOrder,
      },
    });

    return NextResponse.json({
      success: true,
      item: playlistItem,
    });
  } catch (error) {
    console.error("Error adding video to playlist:", error);
    return NextResponse.json(
      { error: "Failed to add video to playlist" },
      { status: 500 }
    );
  }
}

/**
 * Remove a YouTube video from a playlist
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { videoId } = await params;
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get("playlistId");
    const itemId = searchParams.get("itemId");

    if (!playlistId) {
      return NextResponse.json(
        { error: "playlistId is required" },
        { status: 400 }
      );
    }

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 }
      );
    }

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId is required" },
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

    // Verify playlist belongs to user
    const playlist = await db.playlist.findFirst({
      where: {
        id: playlistId,
        userId: user.id,
      },
    });

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found or access denied" },
        { status: 404 }
      );
    }

    // Delete the YouTube playlist item
    await db.youTubePlaylistItem.delete({
      where: {
        id: itemId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Video removed from playlist",
    });
  } catch (error) {
    console.error("Error removing video from playlist:", error);
    return NextResponse.json(
      { error: "Failed to remove video from playlist" },
      { status: 500 }
    );
  }
}

