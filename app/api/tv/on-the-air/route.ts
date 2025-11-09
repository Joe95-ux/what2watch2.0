import { NextRequest, NextResponse } from "next/server";
import { getTVOnTheAir, TMDBResponse, TMDBSeries } from "@/lib/tmdb";

export async function GET(request: NextRequest): Promise<NextResponse<TMDBResponse<TMDBSeries> | { error: string }>> {
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

    const tvPromise = getTVOnTheAir(page);

    let tv: TMDBResponse<TMDBSeries>;
    try {
      tv = await Promise.race([tvPromise, timeoutPromise]);
    } catch (error) {
      // Check if it's a timeout error (from either route-level or fetch-level)
      const isTimeout = error instanceof Error && (
        error.message.includes('timeout') || 
        error.message.includes('Request timeout') ||
        error.message.includes('ETIMEDOUT') ||
        error.name === 'AbortError'
      );
      
      console.warn(`On the air TV ${isTimeout ? 'timeout' : 'error'}, returning empty results:`, error);
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

    return NextResponse.json(tv, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("On the air TV API error:", error);
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

