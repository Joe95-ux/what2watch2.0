import { NextRequest, NextResponse } from "next/server";

interface YouTubeSearchItem {
  id: {
    channelId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      high?: { url: string };
      default?: { url: string };
    };
    customUrl?: string;
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

interface YouTubeChannelItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      high?: { url: string };
      default?: { url: string };
    };
    customUrl?: string;
  };
  statistics?: {
    subscriberCount?: string;
    videoCount?: string;
  };
}

interface YouTubeChannelsResponse {
  items: YouTubeChannelItem[];
}

/**
 * Search for YouTube channels by keyword using YouTube Data API v3
 * Useful for finding Nollywood channels by name
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const maxResults = parseInt(searchParams.get("maxResults") || "5", 10);

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
      console.error("[YouTube Channel Search API] YOUTUBE_API_KEY environment variable is not set");
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    console.log("[YouTube Channel Search API] Searching for channels with query:", query);

    try {
      // First, search for channels
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`,
        {
          next: { revalidate: 3600 }, // Cache for 1 hour
        }
      );

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error("[YouTube Channel Search API] YouTube Search API error:", {
          status: searchResponse.status,
          statusText: searchResponse.statusText,
          body: errorText
        });
        
        // Try to parse error JSON for more details
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            const error = errorJson.error;
            console.error("[YouTube Channel Search API] Error details:", {
              code: error.code,
              message: error.message,
              errors: error.errors
            });
          }
        } catch {
          // Not JSON, ignore
        }
        
        return NextResponse.json(
          { 
            error: "Failed to search channels",
            debug: {
              status: searchResponse.status,
              statusText: searchResponse.statusText,
              message: errorText.substring(0, 500)
            }
          },
          { status: searchResponse.status }
        );
      }

      const searchData: YouTubeSearchResponse = await searchResponse.json();

      if (!searchData.items || searchData.items.length === 0) {
        return NextResponse.json({ channels: [] });
      }

      // Extract channel IDs from search results
      const channelIds = searchData.items.map((item) => item.id.channelId).join(",");

      // Get detailed channel information
      const channelsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?id=${channelIds}&part=snippet,statistics,contentDetails&key=${YOUTUBE_API_KEY}`,
        {
          next: { revalidate: 3600 },
        }
      );

      if (!channelsResponse.ok) {
        const errorText = await channelsResponse.text();
        console.error("[YouTube Channel Search API] YouTube Channels API error:", {
          status: channelsResponse.status,
          statusText: channelsResponse.statusText,
          body: errorText
        });
        
        // Try to parse error JSON for more details
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            const error = errorJson.error;
            console.error("[YouTube Channel Search API] Error details:", {
              code: error.code,
              message: error.message,
              errors: error.errors
            });
          }
        } catch {
          // Not JSON, ignore
        }
        
        return NextResponse.json(
          { 
            error: "Failed to fetch channel details",
            debug: {
              status: channelsResponse.status,
              statusText: channelsResponse.statusText,
              message: errorText.substring(0, 500)
            }
          },
          { status: channelsResponse.status }
        );
      }

      const channelsData: YouTubeChannelsResponse = await channelsResponse.json();

      if (channelsData.items && channelsData.items.length > 0) {
        const channels = channelsData.items.map((item) => ({
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
          customUrl: item.snippet.customUrl,
          subscriberCount: item.statistics?.subscriberCount || "0",
          videoCount: item.statistics?.videoCount || "0",
          channelUrl: `https://www.youtube.com/${item.snippet.customUrl || `channel/${item.id}`}`,
        }));

        return NextResponse.json(
          { channels },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
          }
        );
      }

      return NextResponse.json({ channels: [] });
    } catch (fetchError) {
      console.error("Error fetching from YouTube API:", fetchError);
      return NextResponse.json(
        { error: "Failed to search channels" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in YouTube channel search API:", error);
    return NextResponse.json(
      { error: "Failed to search channels" },
      { status: 500 }
    );
  }
}

