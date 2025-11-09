import { NextRequest, NextResponse } from "next/server";
import { getNowPlayingMovies, TMDBResponse, TMDBMovie } from "@/lib/tmdb";

export async function GET(request: NextRequest): Promise<NextResponse<TMDBResponse<TMDBMovie> | { error: string }>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageParam = searchParams.get("page");
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: "Invalid page parameter" },
        { status: 400 }
      );
    }

    // Add timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 15000); // 15 second total timeout
    });

    const moviesPromise = getNowPlayingMovies(page);

    let movies: TMDBResponse<TMDBMovie>;
    try {
      movies = await Promise.race([moviesPromise, timeoutPromise]);
    } catch (error) {
      // Check if it's a timeout error (from either route-level or fetch-level)
      const isTimeout = error instanceof Error && (
        error.message.includes('timeout') || 
        error.message.includes('Request timeout') ||
        error.message.includes('ETIMEDOUT') ||
        error.name === 'AbortError'
      );
      
      console.warn(`Now playing movies ${isTimeout ? 'timeout' : 'error'}, returning empty results:`, error);
      // Return empty results instead of error
      return NextResponse.json(
        {
          page: 1,
          results: [],
          total_pages: 0,
          total_results: 0,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
          },
        }
      );
    }

    return NextResponse.json(movies, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("Now playing movies API error:", error);
    // Return empty results instead of error
    return NextResponse.json(
      {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0,
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

