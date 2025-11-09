import { NextRequest, NextResponse } from "next/server";
import { getMovieDetails, TMDBMovie, TMDBGenre } from "@/lib/tmdb";

interface RouteParams {
  params: Promise<{ movieId: string }>;
}

interface MovieDetails extends TMDBMovie {
  genres: TMDBGenre[];
  runtime: number;
  budget: number;
  revenue: number;
  production_companies?: Array<{ id: number; name: string; logo_path: string | null }>;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  spoken_languages?: Array<{ english_name: string; iso_639_1: string; name: string }>;
  release_date: string;
  imdb_id?: string;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MovieDetails | { error: string }>> {
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
      setTimeout(() => reject(new Error("Request timeout")), 15000);
    });

    const detailsPromise = getMovieDetails(movieIdNum);

    let details: MovieDetails;
    try {
      details = await Promise.race([detailsPromise, timeoutPromise]);
    } catch (error) {
      console.warn("Movie details timeout or error:", error);
      return NextResponse.json(
        { error: "Failed to fetch movie details" },
        { status: 500 }
      );
    }

    return NextResponse.json(details, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("Movie details API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch movie details";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

