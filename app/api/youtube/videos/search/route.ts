import { NextRequest, NextResponse } from "next/server";

interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
    channelId: string;
    channelTitle: string;
    publishedAt: string;
  };
  contentDetails?: {
    duration: string;
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

interface YouTubeVideoItem {
  id: string;
  contentDetails?: {
    duration: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

interface YouTubeVideosResponse {
  items: YouTubeVideoItem[];
}

interface VideoDetails {
  duration?: string;
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

/**
 * Search YouTube videos globally
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const pageToken = searchParams.get("pageToken") || undefined;
    const maxResults = parseInt(searchParams.get("maxResults") || "20", 10);

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    // Search for videos
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", maxResults.toString());
    searchUrl.searchParams.set("key", YOUTUBE_API_KEY);
    if (pageToken) {
      searchUrl.searchParams.set("pageToken", pageToken);
    }

    const searchResponse = await fetch(searchUrl.toString(), {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("[YouTube Search API] YouTube API error:", {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        body: errorText,
      });
      return NextResponse.json(
        { error: "Failed to search videos" },
        { status: searchResponse.status }
      );
    }

    const searchData: YouTubeSearchResponse = await searchResponse.json();

    // Get video details including duration
    const videoIds = searchData.items.map((item) => item.id.videoId).join(",");
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "contentDetails,snippet,statistics");
    videosUrl.searchParams.set("id", videoIds);
    videosUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const videosResponse = await fetch(videosUrl.toString(), {
      next: { revalidate: 300 },
    });

    const videoDetails: Record<string, VideoDetails> = {};
    if (videosResponse.ok) {
      const videosData: YouTubeVideosResponse = await videosResponse.json();
      if (videosData.items) {
        videosData.items.forEach((item: YouTubeVideoItem) => {
          videoDetails[item.id] = {
            duration: item.contentDetails?.duration,
            statistics: item.statistics,
          };
        });
      }
    }

    const videos = searchData.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail:
        item.snippet.thumbnails.high?.url ||
        item.snippet.thumbnails.medium?.url ||
        item.snippet.thumbnails.default?.url,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      duration: videoDetails[item.id.videoId]?.duration,
      viewCount: videoDetails[item.id.videoId]?.statistics?.viewCount,
      videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    return NextResponse.json(
      {
        videos,
        nextPageToken: searchData.nextPageToken,
        hasMore: !!searchData.nextPageToken,
        totalResults: searchData.pageInfo.totalResults,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error) {
    console.error("Error in YouTube search API:", error);
    return NextResponse.json(
      { error: "Failed to search videos" },
      { status: 500 }
    );
  }
}

