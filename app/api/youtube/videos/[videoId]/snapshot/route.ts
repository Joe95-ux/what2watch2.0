import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Manually create a snapshot for a specific video
 * POST /api/youtube/videos/[videoId]/snapshot
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

    const { videoId } = await params;
    const body = await request.json();
    const { channelId } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId is required" },
        { status: 400 }
      );
    }

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    // Fetch video details from YouTube API
    const videoUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videoUrl.searchParams.set("part", "snippet,statistics,contentDetails");
    videoUrl.searchParams.set("id", videoId);
    videoUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const videoResponse = await fetch(videoUrl.toString(), {
      next: { revalidate: 0 },
    });

    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch video from YouTube API" },
        { status: videoResponse.status }
      );
    }

    const videoData = await videoResponse.json();

    if (!videoData.items || videoData.items.length === 0) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    const video = videoData.items[0];
    const snippet = video.snippet || {};
    const statistics = video.statistics || {};

    // Calculate view velocity
    const publishedAt = new Date(snippet.publishedAt);
    const now = new Date();
    const hoursSincePublish = Math.max(
      (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60),
      1
    );
    const viewCount = parseInt(statistics.viewCount || "0", 10);
    const viewVelocity = viewCount / hoursSincePublish;

    // Calculate engagement rate
    const likeCount = parseInt(statistics.likeCount || "0", 10);
    const commentCount = parseInt(statistics.commentCount || "0", 10);
    const engagementRate =
      viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;

    // Create snapshot
    const snapshot = await db.youTubeVideoSnapshot.create({
      data: {
        videoId,
        channelId: channelId || snippet.channelId || "",
        viewCount: statistics.viewCount || "0",
        likeCount,
        commentCount,
        title: snippet.title || "",
        description: snippet.description || null,
        tags: snippet.tags || [],
        thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || null,
        publishedAt,
        viewVelocity,
        engagementRate,
      },
    });

    return NextResponse.json({
      success: true,
      snapshot: {
        id: snapshot.id,
        videoId: snapshot.videoId,
        viewVelocity: snapshot.viewVelocity,
        engagementRate: snapshot.engagementRate,
        snapshotDate: snapshot.snapshotDate,
      },
    });
  } catch (error) {
    console.error("Error creating video snapshot:", error);
    return NextResponse.json(
      { error: "Failed to create video snapshot" },
      { status: 500 }
    );
  }
}
