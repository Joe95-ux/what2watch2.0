import { NextRequest, NextResponse } from "next/server";

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
  brandingSettings?: {
    image?: {
      bannerExternalUrl?: string;
    };
  };
}

interface YouTubeChannelsResponse {
  items: YouTubeChannelItem[];
}

/**
 * Get single YouTube channel information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;

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
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?id=${channelId}&part=snippet,statistics,contentDetails,brandingSettings&key=${YOUTUBE_API_KEY}`,
        {
          next: { revalidate: 300 }, // Cache for 5 minutes
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[YouTube Channel API] YouTube API error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        return NextResponse.json(
          { 
            error: "Failed to fetch channel information",
            debug: {
              status: response.status,
              statusText: response.statusText,
            }
          },
          { status: response.status }
        );
      }

      const data: YouTubeChannelsResponse = await response.json();

      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const channel = {
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
          bannerImage: item.brandingSettings?.image?.bannerExternalUrl,
          customUrl: item.snippet.customUrl,
          subscriberCount: item.statistics?.subscriberCount || "0",
          videoCount: item.statistics?.videoCount || "0",
          channelUrl: `https://www.youtube.com/${item.snippet.customUrl || `channel/${item.id}`}`,
        };

        return NextResponse.json(
          { channel },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
            },
          }
        );
      }

      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    } catch (fetchError) {
      console.error("Error fetching from YouTube API:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch channel information" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in YouTube channel API:", error);
    return NextResponse.json(
      { error: "Failed to fetch channel information" },
      { status: 500 }
    );
  }
}

