import { NextRequest, NextResponse } from "next/server";
import { discoverMovies, TMDBMovie, TMDBResponse } from "@/lib/tmdb";

interface RouteParams {
  params: Promise<{ genreId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<TMDBResponse<TMDBMovie> | { error: string }>> {
  try {
    const { genreId } = await params;
    const genreIdNum = parseInt(genreId, 10);

    if (isNaN(genreIdNum)) {
      return NextResponse.json(
        { error: "Invalid genre ID" },
        { status: 400 }
      );
    }

    // Add timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 15000); // 15 second total timeout
    });

    const moviesPromise = discoverMovies({
      genre: genreIdNum,
      page: 1,
      sortBy: "popularity.desc",
    });

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
      
      console.warn(`Genre movies ${isTimeout ? 'timeout' : 'error'}, returning empty results:`, error);
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
    console.error("Genre movies API error:", error);
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
