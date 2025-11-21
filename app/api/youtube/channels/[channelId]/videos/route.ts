import { NextRequest, NextResponse } from "next/server";

interface YouTubePlaylistItem {
  contentDetails: {
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
}

interface YouTubePlaylistResponse {
  items: YouTubePlaylistItem[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

interface YouTubeVideoDurationItem {
  id: string;
  contentDetails: {
    duration?: string;
  };
}

interface YouTubeVideoDurationResponse {
  items?: YouTubeVideoDurationItem[];
}

/**
 * Get YouTube channel videos with pagination
 * Supports Load More functionality (20 videos per page)
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
      // First, get the uploads playlist ID from channel
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?id=${channelId}&part=contentDetails&key=${YOUTUBE_API_KEY}`,
        {
          next: { revalidate: 3600 }, // Cache for 1 hour
        }
      );

      if (!channelResponse.ok) {
        return NextResponse.json(
          { error: "Failed to fetch channel details" },
          { status: channelResponse.status }
        );
      }

      const channelData = await channelResponse.json();
      const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

      if (!uploadsPlaylistId) {
        return NextResponse.json(
          { videos: [], nextPageToken: undefined, hasMore: false },
          { status: 200 }
        );
      }

      // Fetch videos from the uploads playlist
      const videosUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      videosUrl.searchParams.set("playlistId", uploadsPlaylistId);
      videosUrl.searchParams.set("part", "snippet,contentDetails");
      videosUrl.searchParams.set("maxResults", String(maxResults));
      videosUrl.searchParams.set("key", YOUTUBE_API_KEY);
      if (pageToken) {
        videosUrl.searchParams.set("pageToken", pageToken);
      }

      const videosResponse = await fetch(videosUrl.toString(), {
        next: { revalidate: 300 }, // Cache for 5 minutes
      });

      if (!videosResponse.ok) {
        const errorText = await videosResponse.text();
        console.error("[YouTube Videos API] YouTube API error:", {
          status: videosResponse.status,
          statusText: videosResponse.statusText,
          body: errorText
        });
        
        return NextResponse.json(
          { 
            error: "Failed to fetch videos",
            debug: {
              status: videosResponse.status,
              statusText: videosResponse.statusText,
            }
          },
          { status: videosResponse.status }
        );
      }

      const videosData = (await videosResponse.json()) as YouTubePlaylistResponse;

      // Get video durations
      const videoIds = videosData.items
        .map((item) => item.contentDetails?.videoId)
        .filter(Boolean) as string[];

      const videoDurations: Record<string, string> = {};
      if (videoIds.length > 0) {
        const durationsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
        durationsUrl.searchParams.set("id", videoIds.join(","));
        durationsUrl.searchParams.set("part", "contentDetails");
        durationsUrl.searchParams.set("key", YOUTUBE_API_KEY);

        const durationsResponse = await fetch(durationsUrl.toString(), {
          next: { revalidate: 300 },
        });

        if (durationsResponse.ok) {
          const durationsData = (await durationsResponse.json()) as YouTubeVideoDurationResponse;
          durationsData.items?.forEach((item) => {
            videoDurations[item.id] = item.contentDetails?.duration || "";
          });
        }
      }

      const videos = videosData.items.map((item) => {
        const videoId = item.contentDetails?.videoId;
        return {
          id: videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          duration: videoDurations[videoId] || undefined,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        };
      });

      return NextResponse.json(
        {
          videos,
          nextPageToken: videosData.nextPageToken || undefined,
          hasMore: !!videosData.nextPageToken,
          totalResults: videosData.pageInfo?.totalResults || 0,
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
        { error: "Failed to fetch videos" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in YouTube videos API:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

