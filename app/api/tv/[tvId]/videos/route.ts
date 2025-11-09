import { NextRequest, NextResponse } from "next/server";
import { getTVVideos, TMDBVideosResponse } from "@/lib/tmdb";

interface RouteParams {
  params: Promise<{ tvId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<TMDBVideosResponse | { error: string }>> {
  try {
    const { tvId } = await params;
    const tvIdNum = parseInt(tvId, 10);

    if (isNaN(tvIdNum)) {
      return NextResponse.json(
        { error: "Invalid TV ID" },
        { status: 400 }
      );
    }

    // Add timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 10000); // 10 second timeout for videos
    });

    const videosPromise = getTVVideos(tvIdNum);

    let videos: TMDBVideosResponse;
    try {
      videos = await Promise.race([videosPromise, timeoutPromise]);
    } catch (error) {
      console.warn("TV videos timeout or error:", error);
      // Return empty results on timeout
      return NextResponse.json(
        {
          id: tvIdNum,
          results: [],
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
          },
        }
      );
    }

    return NextResponse.json(videos, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("TV videos API error:", error);
    return NextResponse.json(
      {
        id: 0,
        results: [],
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      }
    );
  }
}

