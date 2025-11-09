import { NextRequest, NextResponse } from "next/server";
import { getMovieVideos, TMDBVideosResponse } from "@/lib/tmdb";

interface RouteParams {
  params: Promise<{ movieId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<TMDBVideosResponse | { error: string }>> {
  try {
    const { movieId } = await params;
    const movieIdNum = parseInt(movieId, 10);

    if (isNaN(movieIdNum)) {
      return NextResponse.json(
        { error: "Invalid movie ID" },
        { status: 400 }
      );
    }

    // Add timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 10000); // 10 second timeout for videos
    });

    const videosPromise = getMovieVideos(movieIdNum);

    let videos: TMDBVideosResponse;
    try {
      videos = await Promise.race([videosPromise, timeoutPromise]);
    } catch (error) {
      console.warn("Movie videos timeout or error:", error);
      // Return empty results on timeout
      return NextResponse.json(
        {
          id: movieIdNum,
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
    console.error("Movie videos API error:", error);
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

