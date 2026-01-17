import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Background job to collect video snapshots for trending videos
 * This should be called periodically (e.g., via cron job)
 * Supports both GET (for Vercel Cron) and POST requests
 */
export async function GET(request: NextRequest) {
  return handleSnapshotCollection(request);
}

export async function POST(request: NextRequest) {
  return handleSnapshotCollection(request);
}

async function handleSnapshotCollection(request: NextRequest) {
  try {
    // Support both cron secret and user session authentication
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;
    
    // Check if it's a cron request with secret
    const isCronRequest = expectedToken && authHeader === `Bearer ${expectedToken}`;
    
    // If not cron request, check for user authentication (for manual triggers)
    if (!isCronRequest) {
      const { userId: clerkUserId } = await auth();
      if (!clerkUserId) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      
      // For manual triggers, verify user is admin
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { role: true, isForumAdmin: true },
      });
      
      if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.isForumAdmin)) {
        return NextResponse.json(
          { error: "Forbidden: Admin access required" },
          { status: 403 }
        );
      }
    }

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    // Get videos that need snapshots
    // Priority: Videos from favorite channels, recent videos, videos with high view velocity
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Get recent snapshots to find videos that are trending
    const recentSnapshots = await db.youTubeVideoSnapshot.findMany({
      where: {
        snapshotDate: { gte: oneDayAgo },
      },
      select: {
        videoId: true,
        channelId: true,
        viewVelocity: true,
      },
      orderBy: {
        viewVelocity: "desc",
      },
      take: 100, // Top 100 trending videos
    });

    const videoIds = [...new Set(recentSnapshots.map((s) => s.videoId))];
    
    // Also get videos from favorite channels
    const favoriteChannels = await db.favoriteChannel.findMany({
      take: 50, // Limit to avoid too many API calls
      select: {
        channelId: true,
      },
    });

    const channelIds = [...new Set(favoriteChannels.map((fc) => fc.channelId))];

    let totalSnapshots = 0;
    let errors = 0;

    // Collect snapshots for trending videos
    for (const videoId of videoIds.slice(0, 50)) {
      try {
        const snapshot = recentSnapshots.find((s) => s.videoId === videoId);
        if (!snapshot) continue;

        // Fetch current video stats
        const videoUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
        videoUrl.searchParams.set("part", "snippet,statistics,contentDetails");
        videoUrl.searchParams.set("id", videoId);
        videoUrl.searchParams.set("key", YOUTUBE_API_KEY);

        const videoResponse = await fetch(videoUrl.toString(), {
          next: { revalidate: 0 }, // Don't cache for snapshot collection
        });

        if (!videoResponse.ok) {
          errors++;
          continue;
        }

        const videoData = await videoResponse.json();
        if (!videoData.items || videoData.items.length === 0) {
          continue;
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
        await db.youTubeVideoSnapshot.create({
          data: {
            videoId,
            channelId: snippet.channelId || snapshot.channelId,
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

        totalSnapshots++;
      } catch (error) {
        console.error(`Error creating snapshot for video ${videoId}:`, error);
        errors++;
      }
    }

    // Collect snapshots for videos from favorite channels (limited to avoid quota issues)
    if (channelIds.length > 0 && totalSnapshots < 50) {
      for (const channelId of channelIds.slice(0, 10)) {
        try {
          // Get channel's uploads playlist
          const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
          channelUrl.searchParams.set("part", "contentDetails");
          channelUrl.searchParams.set("id", channelId);
          channelUrl.searchParams.set("key", YOUTUBE_API_KEY);

          const channelResponse = await fetch(channelUrl.toString(), {
            next: { revalidate: 3600 },
          });

          if (!channelResponse.ok) continue;

          const channelData = await channelResponse.json();
          const uploadsPlaylistId =
            channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

          if (!uploadsPlaylistId) continue;

          // Get recent videos from channel
          const playlistUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
          playlistUrl.searchParams.set("part", "snippet,contentDetails");
          playlistUrl.searchParams.set("playlistId", uploadsPlaylistId);
          playlistUrl.searchParams.set("maxResults", "5");
          playlistUrl.searchParams.set("key", YOUTUBE_API_KEY);

          const playlistResponse = await fetch(playlistUrl.toString(), {
            next: { revalidate: 300 },
          });

          if (!playlistResponse.ok) continue;

          const playlistData = await playlistResponse.json();
          const recentVideoIds =
            playlistData.items
              ?.map((item: any) => item.contentDetails?.videoId)
              .filter(Boolean)
              .slice(0, 3) || [];

          // Create snapshots for recent videos
          for (const videoId of recentVideoIds) {
            if (totalSnapshots >= 50) break; // Limit total snapshots per run

            try {
              const videoUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
              videoUrl.searchParams.set("part", "snippet,statistics,contentDetails");
              videoUrl.searchParams.set("id", videoId);
              videoUrl.searchParams.set("key", YOUTUBE_API_KEY);

              const videoResponse = await fetch(videoUrl.toString(), {
                next: { revalidate: 0 },
              });

              if (!videoResponse.ok) continue;

              const videoData = await videoResponse.json();
              if (!videoData.items || videoData.items.length === 0) continue;

              const video = videoData.items[0];
              const snippet = video.snippet || {};
              const statistics = video.statistics || {};

              const publishedAt = new Date(snippet.publishedAt);
              const now = new Date();
              const hoursSincePublish = Math.max(
                (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60),
                1
              );
              const viewCount = parseInt(statistics.viewCount || "0", 10);
              const viewVelocity = viewCount / hoursSincePublish;

              const likeCount = parseInt(statistics.likeCount || "0", 10);
              const commentCount = parseInt(statistics.commentCount || "0", 10);
              const engagementRate =
                viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;

              await db.youTubeVideoSnapshot.create({
                data: {
                  videoId,
                  channelId: snippet.channelId || channelId,
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

              totalSnapshots++;
            } catch (error) {
              console.error(`Error creating snapshot for video ${videoId}:`, error);
              errors++;
            }
          }
        } catch (error) {
          console.error(`Error processing channel ${channelId}:`, error);
          errors++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      snapshotsCreated: totalSnapshots,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in snapshot collection job:", error);
    return NextResponse.json(
      { error: "Failed to collect snapshots" },
      { status: 500 }
    );
  }
}
