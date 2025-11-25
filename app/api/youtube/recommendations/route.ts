import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      high?: { url: string };
      default?: { url: string };
    };
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

interface RecommendedVideo {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  videoUrl: string;
}

interface RecommendedChannel {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  customUrl?: string;
  subscriberCount?: string;
  videoCount?: string;
  channelUrl: string;
  slug?: string | null;
}

const PAGE_SIZE = 30;
const MAX_CHANNELS = 10;
const VIDEOS_PER_CHANNEL = 10;

/**
 * Get YouTube video and channel recommendations
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

    const pageParam = request.nextUrl.searchParams.get("page");
    const requestedPage = Number(pageParam) || 1;
    const page = requestedPage < 1 ? 1 : requestedPage;

    // Get user's favorite channels
    const favoriteChannels = await db.favoriteChannel.findMany({
      where: { userId: user.id },
      select: { channelId: true },
      take: 10,
    });

    const channelIds = favoriteChannels.map((fc) => fc.channelId);

    if (channelIds.length === 0) {
      return NextResponse.json({
        recommendedVideos: [],
        recommendedChannels: [],
        message: "Add favorite channels to get recommendations",
      });
    }

    // Get most viewed channels from user's viewing history
    const topViewedChannels = await db.youTubeVideoView.groupBy({
      by: ["channelId"],
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    });

    const recommendedChannelIds = [
      ...channelIds,
      ...topViewedChannels.map((c) => c.channelId),
    ].slice(0, 10);

    // Get videos from favorite channels (recent)
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    const recommendedVideos: RecommendedVideo[] = [];

    if (YOUTUBE_API_KEY && recommendedChannelIds.length > 0) {
      const channelsToFetch = recommendedChannelIds.slice(0, MAX_CHANNELS);

      const channelVideoPromises = channelsToFetch.map(async (channelId) => {
        try {
          const videosUrl = new URL(
            "https://www.googleapis.com/youtube/v3/search"
          );
          videosUrl.searchParams.set("part", "snippet");
          videosUrl.searchParams.set("channelId", channelId);
          videosUrl.searchParams.set("type", "video");
          videosUrl.searchParams.set(
            "maxResults",
            String(VIDEOS_PER_CHANNEL)
          );
          videosUrl.searchParams.set("order", "date");
          videosUrl.searchParams.set("key", YOUTUBE_API_KEY);

          const response = await fetch(videosUrl.toString(), {
            next: { revalidate: 3600 }, // Cache for 1 hour
          });

          if (!response.ok) {
            return [];
          }

          const data: YouTubeSearchResponse = await response.json();
          if (!data.items) {
            return [];
          }

          return data.items.map(
            (item: YouTubeSearchItem): RecommendedVideo => ({
              id: item.id.videoId,
              title: item.snippet.title,
              description: item.snippet.description,
              thumbnail:
                item.snippet.thumbnails.high?.url ||
                item.snippet.thumbnails.default?.url,
              channelId: item.snippet.channelId,
              channelTitle: item.snippet.channelTitle,
              publishedAt: item.snippet.publishedAt,
              videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            })
          );
        } catch (error) {
          console.error(`Error fetching videos for channel ${channelId}:`, error);
          return [];
        }
      });

      const channelVideos = await Promise.all(channelVideoPromises);
      channelVideos.forEach((videos) => {
        recommendedVideos.push(...videos);
      });
    }

    const uniqueVideosMap = new Map<string, RecommendedVideo>();
    recommendedVideos.forEach((video) => {
      if (!uniqueVideosMap.has(video.id)) {
        uniqueVideosMap.set(video.id, video);
      }
    });

    const sortedVideos = Array.from(uniqueVideosMap.values()).sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    const totalVideos = sortedVideos.length;
    const totalPages =
      totalVideos === 0 ? 0 : Math.ceil(totalVideos / PAGE_SIZE);
    const currentPage =
      totalPages === 0 ? 1 : Math.min(page, totalPages) || 1;
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const paginatedVideos =
      totalVideos === 0
        ? []
        : sortedVideos.slice(startIndex, startIndex + PAGE_SIZE);

    // Get recommended channels (similar to favorite channels)
    // For now, return empty array - can be enhanced with ML recommendations
    const recommendedChannels: RecommendedChannel[] = [];

    return NextResponse.json(
      {
        recommendedVideos: paginatedVideos,
        recommendedChannels,
        pagination: {
          page: currentPage,
          pageSize: PAGE_SIZE,
          totalVideos,
          totalPages,
          hasNextPage: totalPages > 0 && currentPage < totalPages,
          hasPreviousPage: currentPage > 1,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}

