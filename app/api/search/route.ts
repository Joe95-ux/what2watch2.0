import { NextRequest, NextResponse } from "next/server";
import { searchMovies, searchTV, discoverMovies, discoverTV, TMDBResponse, TMDBMovie, TMDBSeries } from "@/lib/tmdb";

type SearchType = "movie" | "tv" | "all";

interface ErrorResponse {
  error: string;
}

const createEmptyResponse = (): TMDBResponse<TMDBMovie | TMDBSeries> => ({
  page: 1,
  results: [],
  total_pages: 0,
  total_results: 0,
});

export async function GET(request: NextRequest): Promise<NextResponse<TMDBResponse<TMDBMovie | TMDBSeries> | ErrorResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");
    const type = (searchParams.get("type") || "all") as SearchType;
    const pageParam = searchParams.get("page");
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const genreParam = searchParams.get("genre");
    // Parse genre from comma-separated string to array
    const genre = genreParam 
      ? genreParam.split(",").map(id => parseInt(id, 10)).filter(id => !isNaN(id))
      : null;
    const year = searchParams.get("year");
    const minRating = searchParams.get("minRating");
    const sortBy = searchParams.get("sortBy") || "popularity.desc";

    // Allow requests with filters even without query
    const hasQuery = query && query.trim().length > 0;
    const hasFilters = !!(genre || year || minRating);
    
    if (!hasQuery && !hasFilters) {
      return NextResponse.json(
        { error: "Query parameter or filters are required" },
        { status: 400 }
      );
    }

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

    let results: TMDBResponse<TMDBMovie | TMDBSeries>;

    try {
      // If filters are provided, use discover instead of search
      if (genre || year || minRating) {
        const filters = {
          page,
          ...(genre && genre.length > 0 && { genre: genre.length === 1 ? genre[0] : genre }),
          ...(year && { year: parseInt(year, 10) }),
          ...(minRating && { minRating: parseFloat(minRating) }),
          sortBy,
        };

        if (type === "movie") {
          results = await Promise.race([discoverMovies(filters), timeoutPromise]);
        } else if (type === "tv") {
          results = await Promise.race([discoverTV(filters), timeoutPromise]);
        } else {
          // Search both
          const [movies, tv] = await Promise.race([
            Promise.all([discoverMovies(filters), discoverTV(filters)]),
            timeoutPromise,
          ]);
          results = {
            page,
            results: [...movies.results, ...tv.results],
            total_pages: Math.max(movies.total_pages, tv.total_pages),
            total_results: movies.total_results + tv.total_results,
          };
        }
      } else if (query) {
        // Regular search
        if (type === "movie") {
          results = await Promise.race([searchMovies(query, page), timeoutPromise]);
        } else if (type === "tv") {
          results = await Promise.race([searchTV(query, page), timeoutPromise]);
        } else {
          // Search both and combine
          const [movies, tv] = await Promise.race([
            Promise.all([searchMovies(query, page), searchTV(query, page)]),
            timeoutPromise,
          ]);
          results = {
            page,
            results: [...movies.results, ...tv.results],
            total_pages: Math.max(movies.total_pages, tv.total_pages),
            total_results: movies.total_results + tv.total_results,
          };
        }
      } else {
        results = createEmptyResponse();
      }
    } catch (error) {
      // Check if it's a timeout error (from either route-level or fetch-level)
      const isTimeout = error instanceof Error && (
        error.message.includes('timeout') || 
        error.message.includes('Request timeout') ||
        error.message.includes('ETIMEDOUT') ||
        error.name === 'AbortError'
      );
      
      console.warn(`Search API ${isTimeout ? 'timeout' : 'error'}, returning empty results:`, error);
      return NextResponse.json(createEmptyResponse(), {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      });
    }

    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(createEmptyResponse(), {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    });
  }
}
