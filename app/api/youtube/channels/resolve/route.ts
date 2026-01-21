import { NextRequest, NextResponse } from "next/server";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Resolve channel handle/URL to channel ID
 * GET /api/youtube/channels/resolve?handle=channelname
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get("handle");

    if (!handle) {
      return NextResponse.json(
        { error: "handle parameter is required" },
        { status: 400 }
      );
    }

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    // Remove @ if present
    const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;

    // Use forHandle parameter to resolve channel
    const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelUrl.searchParams.set("part", "id,snippet");
    channelUrl.searchParams.set("forHandle", cleanHandle);
    channelUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const response = await fetch(channelUrl.toString(), {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("YouTube API error resolving handle:", errorText);
      return NextResponse.json(
        { error: "Failed to resolve channel handle" },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    const channel = data.items[0];

    return NextResponse.json({
      channelId: channel.id,
      title: channel.snippet?.title,
      thumbnail: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url,
    });
  } catch (error) {
    console.error("Error resolving channel handle:", error);
    return NextResponse.json(
      { error: "Failed to resolve channel handle" },
      { status: 500 }
    );
  }
}
