import { NextRequest, NextResponse } from "next/server";
import { searchMovies, searchTV, TMDBResponse, TMDBMovie, TMDBSeries } from "@/lib/tmdb";

type SearchType = "movie" | "tv" | "all";

interface ErrorResponse {
  error: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<TMDBResponse<TMDBMovie | TMDBSeries> | ErrorResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");
    const type = (searchParams.get("type") || "all") as SearchType;
    const pageParam = searchParams.get("page");
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: "Invalid page parameter" },
        { status: 400 }
      );
    }

    let results: TMDBResponse<TMDBMovie | TMDBSeries>;

    if (type === "movie") {
      const movieResults = await searchMovies(query, page);
      results = movieResults;
    } else if (type === "tv") {
      const tvResults = await searchTV(query, page);
      results = tvResults;
    } else {
      // Search both and combine
      const [movies, tv] = await Promise.all([
        searchMovies(query, page),
        searchTV(query, page),
      ]);
      results = {
        page,
        results: [...movies.results, ...tv.results],
        total_pages: Math.max(movies.total_pages, tv.total_pages),
        total_results: movies.total_results + tv.total_results,
      };
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to search";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

