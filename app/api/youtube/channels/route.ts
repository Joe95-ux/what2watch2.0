import { NextRequest, NextResponse } from "next/server";

/**
 * Get YouTube channel information using YouTube Data API v3
 * Returns channel details including thumbnail, title, and custom URL
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelIds = searchParams.get("channelIds");

    if (!channelIds) {
      return NextResponse.json(
        { error: "channelIds is required (comma-separated)" },
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

    const channelIdArray = channelIds.split(",").map(id => id.trim());

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?id=${channelIdArray.join(",")}&part=snippet,statistics,contentDetails&key=${YOUTUBE_API_KEY}`,
        {
          next: { revalidate: 3600 }, // Cache for 1 hour
        }
      );

      if (!response.ok) {
        console.error("YouTube API error:", response.status, response.statusText);
        return NextResponse.json(
          { error: "Failed to fetch channel information" },
          { status: response.status }
        );
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const channels = data.items.map((item: any) => ({
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
        { error: "Failed to fetch channel information" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in YouTube channels API:", error);
    return NextResponse.json(
      { error: "Failed to fetch channel information" },
      { status: 500 }
    );
  }
}

