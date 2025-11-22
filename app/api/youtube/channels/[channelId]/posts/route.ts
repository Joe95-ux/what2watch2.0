import { NextRequest, NextResponse } from "next/server";

interface YouTubePost {
  id: string;
  text: string;
  author: string;
  authorThumbnail?: string;
  publishedAt: string;
  likeCount: number;
  commentCount: number;
  images?: string[];
  videoId?: string;
  videoTitle?: string;
  videoThumbnail?: string;
}

interface YouTubePostsResponse {
  items: Array<{
    id: string;
    snippet: {
      type: string;
      publishedAt: string;
      channelId: string;
      title: string;
      description: string;
      thumbnails?: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
      };
      communityDetails?: {
        totalItemCount: number;
      };
    };
    contentDetails?: {
      totalItemCount: number;
    };
  }>;
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

/**
 * Get YouTube channel community posts
 * Note: YouTube Data API v3 doesn't have a direct endpoint for community posts.
 * This is a placeholder implementation that would need to use the YouTube Data API
 * or scrape the channel's community tab.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get("pageToken") || undefined;
    const maxResults = parseInt(searchParams.get("maxResults") || "20", 10);

    if (!channelId) {
      return NextResponse.json(
        { error: "channelId is required" },
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

    try {
      // Note: YouTube Data API v3 doesn't provide community posts directly
      // This would require using the Activities API or scraping
      // For now, we'll return an empty array with a note
      // In a real implementation, you might need to:
      // 1. Use YouTube Data API Activities endpoint (limited)
      // 2. Scrape the channel's community tab
      // 3. Use a third-party service

      // Placeholder: Return empty posts for now
      // In production, you would implement actual post fetching here
      const posts: YouTubePost[] = [];

      return NextResponse.json(
        {
          posts,
          nextPageToken: undefined,
          hasMore: false,
          totalResults: 0,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
          },
        }
      );
    } catch (fetchError) {
      console.error("Error fetching from YouTube API:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch posts" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in YouTube posts API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

