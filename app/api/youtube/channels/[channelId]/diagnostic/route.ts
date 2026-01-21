import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Analyze a channel and generate diagnostic report
 * GET /api/youtube/channels/[channelId]/diagnostic
 */
export async function GET(
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

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    const { channelId } = await params;

    // Validate that it's a channel ID (should be resolved in frontend)
    if (!/^UC[a-zA-Z0-9_-]{22}$/.test(channelId)) {
      return NextResponse.json(
        { error: "Invalid channel ID format. Channel ID must start with 'UC' and be 24 characters long." },
        { status: 400 }
      );
    }
    
    // Fetch channel details
    const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelUrl.searchParams.set("part", "snippet,statistics,contentDetails");
    channelUrl.searchParams.set("id", channelId);
    channelUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const channelResponse = await fetch(channelUrl.toString(), {
      next: { revalidate: 3600 },
    });

    if (!channelResponse.ok) {
      const errorText = await channelResponse.text();
      console.error("YouTube API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch channel from YouTube API. Make sure the channel ID is correct and the channel is public." },
        { status: channelResponse.status }
      );
    }

    const channelData = await channelResponse.json();

    if (!channelData.items || channelData.items.length === 0) {
      return NextResponse.json(
        { error: "Channel not found. Please check the channel ID or URL and ensure the channel is public." },
        { status: 404 }
      );
    }
    
    const actualChannelId = channelData.items[0].id;

    const channel = channelData.items[0];
    const statistics = channel.statistics || {};
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return NextResponse.json(
        { error: "Channel uploads playlist not found" },
        { status: 404 }
      );
    }

    // Fetch recent videos (last 50)
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    videosUrl.searchParams.set("part", "snippet,contentDetails");
    videosUrl.searchParams.set("playlistId", uploadsPlaylistId);
    videosUrl.searchParams.set("maxResults", "50");
    videosUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const videosResponse = await fetch(videosUrl.toString(), {
      next: { revalidate: 3600 },
    });

    if (!videosResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch videos from YouTube API" },
        { status: videosResponse.status }
      );
    }

    const videosData = await videosResponse.json();
    const videoItems = videosData.items || [];

    if (videoItems.length === 0) {
      return NextResponse.json(
        { error: "No videos found for this channel" },
        { status: 404 }
      );
    }

    const videoIds = videoItems
      .map((item: any) => item.contentDetails?.videoId)
      .filter(Boolean)
      .slice(0, 50)
      .join(",");

    // Get video statistics
    const videoStatsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videoStatsUrl.searchParams.set("part", "snippet,statistics");
    videoStatsUrl.searchParams.set("id", videoIds);
    videoStatsUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const videoStatsResponse = await fetch(videoStatsUrl.toString(), {
      next: { revalidate: 3600 },
    });

    if (!videoStatsResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch video statistics" },
        { status: videoStatsResponse.status }
      );
    }

    const videoStatsData = await videoStatsResponse.json();
    const videos = videoStatsData.items || [];

    // Calculate metrics
    const now = new Date();
    const viewCounts: number[] = [];
    const engagementRates: number[] = [];
    const publishedDates: Date[] = [];
    const titleLengths: number[] = [];
    let videosWithBrackets = 0;
    let videosWithNumbers = 0;
    let videosWithQuestions = 0;

    videos.forEach((video: any) => {
      const viewCount = parseInt(video.statistics?.viewCount || "0", 10);
      const likeCount = parseInt(video.statistics?.likeCount || "0", 10);
      const commentCount = parseInt(video.statistics?.commentCount || "0", 10);
      const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;

      viewCounts.push(viewCount);
      engagementRates.push(engagementRate);

      const publishedAt = new Date(video.snippet?.publishedAt || now);
      publishedDates.push(publishedAt);

      const title = video.snippet?.title || "";
      titleLengths.push(title.length);
      if (/[\[\]()]/.test(title)) videosWithBrackets++;
      if (/\d/.test(title)) videosWithNumbers++;
      if (/[?]/.test(title)) videosWithQuestions++;
    });

    // Calculate averages
    const avgViews = viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length;
    const avgEngagement = engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length;
    const avgTitleLength = titleLengths.reduce((a, b) => a + b, 0) / titleLengths.length;

    // Calculate upload frequency (videos per week)
    if (publishedDates.length < 2) {
      return NextResponse.json(
        { error: "Not enough videos to calculate upload frequency" },
        { status: 400 }
      );
    }

    const oldestDate = new Date(Math.min(...publishedDates.map((d) => d.getTime())));
    const newestDate = new Date(Math.max(...publishedDates.map((d) => d.getTime())));
    const weeksSinceOldest = Math.max(
      (now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 7),
      1
    );
    const uploadFrequency = videos.length / weeksSinceOldest;

    // Get top performing videos
    const videosWithMetrics = videos.map((video: any, index: number) => ({
      videoId: video.id,
      title: video.snippet?.title,
      viewCount: parseInt(video.statistics?.viewCount || "0", 10),
      engagementRate: engagementRates[index],
      publishedAt: publishedDates[index],
    }));

    const topVideosByViews = videosWithMetrics
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 10)
      .map((v) => v.videoId);

    const topVideosByEngagement = videosWithMetrics
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 10)
      .map((v) => v.videoId);

    // Get video analyses from database for thumbnail patterns
    const videoAnalyses = await db.youTubeVideoAnalysis.findMany({
      where: {
        videoId: { in: videos.map((v: any) => v.id) },
      },
    });

    const videosWithFaces = videoAnalyses.filter((a) => a.hasFace).length;
    const videosWithText = videoAnalyses.filter((a) => a.hasText).length;
    const percentWithFaces = (videosWithFaces / videos.length) * 100;
    const percentWithText = (videosWithText / videos.length) * 100;

    // Calculate growth rates (simplified - would need historical data for accurate calculation)
    const subscriberCount = parseInt(statistics.subscriberCount || "0", 10);
    const totalViews = parseInt(statistics.viewCount || "0", 10);
    const videoCount = parseInt(statistics.videoCount || "0", 10);

    // Calculate meaningful metrics (not true growth rates, but useful indicators)
    // Since we don't have historical data, we'll show subscribers and views per video
    // These give insight into channel performance
    const subscribersPerVideo = videoCount > 0 ? subscriberCount / videoCount : 0;
    const viewsPerVideo = videoCount > 0 ? totalViews / videoCount : 0;
    
    // Store these values (we'll display them as "per video" metrics in the UI)
    const subscriberGrowthRate = subscribersPerVideo;
    const viewGrowthRate = viewsPerVideo;

    // Determine best format based on title patterns
    // Analyze what type of content performs best
    const questionRatio = videosWithQuestions / videos.length;
    const numberRatio = videosWithNumbers / videos.length;
    
    let bestFormat = "Mixed Content";
    if (questionRatio > 0.3) {
      bestFormat = "Tutorials & How-To Guides";
    } else if (numberRatio > 0.3) {
      bestFormat = "List Videos (Top 10, Rankings)";
    } else if (videosWithBrackets / videos.length > 0.4) {
      bestFormat = "Formatted Titles (with brackets)";
    }

    // Create or update diagnostic (use actual channel ID)
    const diagnostic = await db.channelDiagnostic.upsert({
      where: {
        channelId_analyzedBy: {
          channelId: actualChannelId,
          analyzedBy: user.id,
        },
      },
      update: {
        avgViews: avgViews.toString(),
        avgEngagement,
        uploadFrequency,
        bestFormat,
        subscriberGrowthRate,
        viewGrowthRate,
        avgTitleLength,
        percentWithBrackets: (videosWithBrackets / videos.length) * 100,
        percentWithNumbers: (videosWithNumbers / videos.length) * 100,
        percentWithQuestions: (videosWithQuestions / videos.length) * 100,
        percentWithFaces,
        percentWithText,
        topVideosByViews,
        topVideosByEngagement,
      },
      create: {
        channelId: actualChannelId,
        analyzedBy: user.id,
        avgViews: avgViews.toString(),
        avgEngagement,
        uploadFrequency,
        bestFormat,
        subscriberGrowthRate,
        viewGrowthRate,
        avgTitleLength,
        percentWithBrackets: (videosWithBrackets / videos.length) * 100,
        percentWithNumbers: (videosWithNumbers / videos.length) * 100,
        percentWithQuestions: (videosWithQuestions / videos.length) * 100,
        percentWithFaces,
        percentWithText,
        topVideosByViews,
        topVideosByEngagement,
      },
    }).catch(async () => {
      // If upsert fails, try to find existing and update
      const existing = await db.channelDiagnostic.findFirst({
        where: {
          channelId,
          analyzedBy: user.id,
        },
      });

      if (existing) {
        return await db.channelDiagnostic.update({
          where: { id: existing.id },
          data: {
            channelId: actualChannelId,
            avgViews: avgViews.toString(),
            avgEngagement,
            uploadFrequency,
            bestFormat,
            subscriberGrowthRate,
            viewGrowthRate,
            avgTitleLength,
            percentWithBrackets: (videosWithBrackets / videos.length) * 100,
            percentWithNumbers: (videosWithNumbers / videos.length) * 100,
            percentWithQuestions: (videosWithQuestions / videos.length) * 100,
            percentWithFaces,
            percentWithText,
            topVideosByViews,
            topVideosByEngagement,
          },
        });
      } else {
        return await db.channelDiagnostic.create({
          data: {
            channelId: actualChannelId,
            analyzedBy: user.id,
            avgViews: avgViews.toString(),
            avgEngagement,
            uploadFrequency,
            bestFormat,
            subscriberGrowthRate,
            viewGrowthRate,
            avgTitleLength,
            percentWithBrackets: (videosWithBrackets / videos.length) * 100,
            percentWithNumbers: (videosWithNumbers / videos.length) * 100,
            percentWithQuestions: (videosWithQuestions / videos.length) * 100,
            percentWithFaces,
            percentWithText,
            topVideosByViews,
            topVideosByEngagement,
          },
        });
      }
    });

    // Get top videos details with thumbnails
    const topVideosDetails = videosWithMetrics
      .filter((v) => topVideosByViews.includes(v.videoId) || topVideosByEngagement.includes(v.videoId))
      .slice(0, 10)
      .map((v) => {
        const video = videos.find((vid: any) => vid.id === v.videoId);
        return {
          videoId: v.videoId,
          title: v.title,
          viewCount: v.viewCount,
          engagementRate: v.engagementRate,
          publishedAt: v.publishedAt,
          thumbnail: video?.snippet?.thumbnails?.high?.url || video?.snippet?.thumbnails?.medium?.url || video?.snippet?.thumbnails?.default?.url || null,
        };
      });

    return NextResponse.json({
      diagnostic: {
        id: diagnostic.id,
        channelId: actualChannelId,
        avgViews: diagnostic.avgViews,
        avgEngagement: diagnostic.avgEngagement,
        uploadFrequency: diagnostic.uploadFrequency,
        bestFormat: diagnostic.bestFormat,
        subscriberGrowthRate: diagnostic.subscriberGrowthRate,
        viewGrowthRate: diagnostic.viewGrowthRate,
        avgTitleLength: diagnostic.avgTitleLength,
        percentWithBrackets: diagnostic.percentWithBrackets,
        percentWithNumbers: diagnostic.percentWithNumbers,
        percentWithQuestions: diagnostic.percentWithQuestions,
        percentWithFaces: diagnostic.percentWithFaces,
        percentWithText: diagnostic.percentWithText,
        analyzedAt: diagnostic.analyzedAt,
      },
      channel: {
        title: channel.snippet?.title,
        thumbnail: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.medium?.url || channel.snippet?.thumbnails?.default?.url || null,
        subscriberCount: statistics.subscriberCount,
        videoCount: statistics.videoCount,
        viewCount: statistics.viewCount,
      },
      topVideos: topVideosDetails,
      totalVideosAnalyzed: videos.length,
    });
  } catch (error) {
    console.error("Error generating channel diagnostic:", error);
    return NextResponse.json(
      { error: "Failed to generate channel diagnostic" },
      { status: 500 }
    );
  }
}
