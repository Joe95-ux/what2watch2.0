import { NextRequest, NextResponse } from "next/server";

interface YouTubePlaylistItem {
  id: string;
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
    itemCount: number;
  };
}

interface YouTubePlaylistsResponse {
  items: YouTubePlaylistItem[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

/**
 * Get YouTube channel playlists
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get("pageToken") || undefined;
    const maxResults = parseInt(searchParams.get("maxResults") || "50", 10);

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
      const playlistsUrl = new URL("https://www.googleapis.com/youtube/v3/playlists");
      playlistsUrl.searchParams.set("part", "snippet,contentDetails");
      playlistsUrl.searchParams.set("channelId", channelId);
      playlistsUrl.searchParams.set("maxResults", String(maxResults));
      playlistsUrl.searchParams.set("key", YOUTUBE_API_KEY);
      if (pageToken) {
        playlistsUrl.searchParams.set("pageToken", pageToken);
      }

      const playlistsResponse = await fetch(playlistsUrl.toString(), {
        next: { revalidate: 300 }, // Cache for 5 minutes
      });

      if (!playlistsResponse.ok) {
        const errorText = await playlistsResponse.text();
        console.error("[YouTube Playlists API] YouTube API error:", {
          status: playlistsResponse.status,
          statusText: playlistsResponse.statusText,
          body: errorText
        });
        
        return NextResponse.json(
          { 
            error: "Failed to fetch playlists",
            debug: {
              status: playlistsResponse.status,
              statusText: playlistsResponse.statusText,
            }
          },
          { status: playlistsResponse.status }
        );
      }

      const playlistsData = (await playlistsResponse.json()) as YouTubePlaylistsResponse;

      const playlists = playlistsData.items.map((item) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        itemCount: item.contentDetails?.itemCount || 0,
        playlistUrl: `https://www.youtube.com/playlist?list=${item.id}`,
      }));

      return NextResponse.json(
        {
          playlists,
          nextPageToken: playlistsData.nextPageToken || undefined,
          hasMore: !!playlistsData.nextPageToken,
          totalResults: playlistsData.pageInfo?.totalResults || 0,
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
        { error: "Failed to fetch playlists" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in YouTube playlists API:", error);
    return NextResponse.json(
      { error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}

