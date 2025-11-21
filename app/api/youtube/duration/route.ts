import { NextRequest, NextResponse } from "next/server";

/**
 * Get YouTube video duration using YouTube Data API v3
 * Requires YOUTUBE_API_KEY environment variable
 * 
 * If no API key is configured, returns null
 * Duration is returned in seconds
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId is required" },
        { status: 400 }
      );
    }

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
      // No API key configured - return null
      // You can get a free YouTube Data API v3 key from:
      // https://console.cloud.google.com/apis/credentials
      return NextResponse.json({ duration: null });
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${YOUTUBE_API_KEY}`,
        {
          next: { revalidate: 86400 }, // Cache for 24 hours
        }
      );

      if (!response.ok) {
        console.error("YouTube API error:", response.status, response.statusText);
        return NextResponse.json({ duration: null });
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const duration = data.items[0].contentDetails.duration; // ISO 8601 format (e.g., "PT2M15S")
        
        // Parse ISO 8601 duration format: PT[#H][#M][#S]
        // Examples: "PT2M15S" = 2 minutes 15 seconds, "PT1H30M" = 1 hour 30 minutes
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (match) {
          const hours = parseInt(match[1] || "0", 10);
          const minutes = parseInt(match[2] || "0", 10);
          const seconds = parseInt(match[3] || "0", 10);
          const totalSeconds = hours * 3600 + minutes * 60 + seconds;
          
          return NextResponse.json(
            { duration: totalSeconds },
            {
              headers: {
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
              },
            }
          );
        }
      }

      return NextResponse.json({ duration: null });
    } catch (fetchError) {
      console.error("Error fetching from YouTube API:", fetchError);
      return NextResponse.json({ duration: null });
    }
  } catch (error) {
    console.error("Error in YouTube duration API:", error);
    return NextResponse.json(
      { error: "Failed to fetch video duration" },
      { status: 500 }
    );
  }
}

