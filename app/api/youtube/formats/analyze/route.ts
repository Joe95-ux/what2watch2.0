import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Analyze format performance for a keyword/topic
 * GET /api/youtube/formats/analyze?keyword=iphone+review&limit=20
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

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!keyword) {
      return NextResponse.json(
        { error: "keyword parameter is required" },
        { status: 400 }
      );
    }

    // Search for videos with this keyword
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", keyword);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("order", "viewCount");
    searchUrl.searchParams.set("maxResults", limit.toString());
    searchUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const searchResponse = await fetch(searchUrl.toString(), {
      next: { revalidate: 300 },
    });

    if (!searchResponse.ok) {
      return NextResponse.json(
        { error: "Failed to search YouTube" },
        { status: searchResponse.status }
      );
    }

    const searchData = await searchResponse.json();
    const videoIds = searchData.items?.map((item: any) => item.id.videoId).join(",") || "";

    if (!videoIds) {
      return NextResponse.json(
        { error: "No videos found" },
        { status: 404 }
      );
    }

    // Get video statistics
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "snippet,statistics");
    videosUrl.searchParams.set("id", videoIds);
    videosUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const videosResponse = await fetch(videosUrl.toString(), {
      next: { revalidate: 300 },
    });

    if (!videosResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch video statistics" },
        { status: videosResponse.status }
      );
    }

    const videosData = await videosResponse.json();
    const videos = videosData.items || [];

    // Get or classify formats for these videos
    const videoIdsArray = videoIds.split(",");
    const existingFormats = await db.videoFormat.findMany({
      where: {
        videoId: { in: videoIdsArray },
      },
    });

    const formatMap = new Map(existingFormats.map(f => [f.videoId, f.format]));

    // Classify videos that don't have formats yet
    const videosToClassify = videos.filter((v: any) => !formatMap.has(v.id));
    
    // For videos without formats, use simple heuristics based on title
    // Full AI classification can be done separately via the classify endpoint
    for (const video of videosToClassify) {
      const title = (video.snippet?.title || "").toLowerCase();
      let format = "general";
      
      // Simple format detection based on title patterns
      if (title.includes("how to") || title.includes("tutorial") || title.includes("guide")) {
        format = "tutorial";
      } else if (title.includes("top") || title.includes("list") || /\d+/.test(title)) {
        format = "list";
      } else if (title.includes("review") || title.includes("vs") || title.includes("comparison")) {
        format = "review";
      } else if (title.includes("vlog") || title.includes("day in my life")) {
        format = "vlog";
      } else if (title.includes("reaction") || title.includes("reacting")) {
        format = "reaction";
      } else if (title.includes("challenge") || title.includes("experiment")) {
        format = "challenge";
      }
      
      formatMap.set(video.id, format);
    }

    // Group videos by format and calculate performance
    const formatStats = new Map<string, {
      videos: any[];
      totalViews: number;
      totalEngagement: number;
    }>();

    videos.forEach((video: any) => {
      const format = formatMap.get(video.id) || "general";
      const viewCount = parseInt(video.statistics?.viewCount || "0", 10);
      const likeCount = parseInt(video.statistics?.likeCount || "0", 10);
      const commentCount = parseInt(video.statistics?.commentCount || "0", 10);
      const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;

      if (!formatStats.has(format)) {
        formatStats.set(format, {
          videos: [],
          totalViews: 0,
          totalEngagement: 0,
        });
      }

      const stats = formatStats.get(format)!;
      stats.videos.push({
        videoId: video.id,
        title: video.snippet?.title,
        thumbnail: video.snippet?.thumbnails?.high?.url || 
                   video.snippet?.thumbnails?.medium?.url || 
                   video.snippet?.thumbnails?.default?.url,
        viewCount,
        engagementRate,
      });
      stats.totalViews += viewCount;
      stats.totalEngagement += engagementRate;
    });

    // Convert to response format
    const formatAnalysis = Array.from(formatStats.entries()).map(([format, stats]) => ({
      format,
      videoCount: stats.videos.length,
      avgViews: Math.round(stats.totalViews / stats.videos.length),
      avgEngagement: stats.totalEngagement / stats.videos.length,
      topVideos: stats.videos
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 3),
    })).sort((a, b) => b.avgEngagement - a.avgEngagement);

    return NextResponse.json({
      keyword,
      formatAnalysis,
      totalVideos: videos.length,
    });
  } catch (error) {
    console.error("Error analyzing formats:", error);
    return NextResponse.json(
      { error: "Failed to analyze formats" },
      { status: 500 }
    );
  }
}
