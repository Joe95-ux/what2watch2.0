import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

interface VideoSnapshotData {
  videoId: string;
  channelId: string;
  viewCount: string;
  likeCount: number;
  commentCount: number;
  title: string;
  description?: string;
  tags?: string[];
  thumbnailUrl?: string;
  publishedAt: Date;
}

/**
 * Create a snapshot of video metrics for trend tracking
 * POST /api/youtube/videos/snapshot
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

    const body = await request.json();
    const { videoId, channelId } = body;

    if (!videoId || !channelId) {
      return NextResponse.json(
        { error: "videoId and channelId are required" },
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
      next: { revalidate: 300 }, // Cache for 5 minutes
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

    // Calculate view velocity (views per hour since publish)
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

    // Prepare snapshot data using the interface
    const snapshotData: VideoSnapshotData = {
      videoId,
      channelId,
      viewCount: statistics.viewCount || "0",
      likeCount,
      commentCount,
      title: snippet.title || "",
      description: snippet.description || undefined,
      tags: snippet.tags || undefined,
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || undefined,
      publishedAt,
    };

    // Create snapshot
    const snapshot = await db.youTubeVideoSnapshot.create({
      data: {
        videoId: snapshotData.videoId,
        channelId: snapshotData.channelId,
        viewCount: snapshotData.viewCount,
        likeCount: snapshotData.likeCount,
        commentCount: snapshotData.commentCount,
        title: snapshotData.title,
        description: snapshotData.description || null,
        tags: snapshotData.tags || [],
        thumbnailUrl: snapshotData.thumbnailUrl || null,
        publishedAt: snapshotData.publishedAt,
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

/**
 * Get video snapshots for a specific video
 * GET /api/youtube/videos/snapshot?videoId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId is required" },
        { status: 400 }
      );
    }

    const snapshots = await db.youTubeVideoSnapshot.findMany({
      where: { videoId },
      orderBy: { snapshotDate: "desc" },
      take: limit,
    });

    return NextResponse.json({
      snapshots: snapshots.map((s) => ({
        id: s.id,
        videoId: s.videoId,
        viewCount: s.viewCount,
        likeCount: s.likeCount,
        commentCount: s.commentCount,
        viewVelocity: s.viewVelocity,
        engagementRate: s.engagementRate,
        snapshotDate: s.snapshotDate,
      })),
    });
  } catch (error) {
    console.error("Error fetching video snapshots:", error);
    return NextResponse.json(
      { error: "Failed to fetch video snapshots" },
      { status: 500 }
    );
  }
}
