import { NextRequest, NextResponse } from "next/server";
import { getTVDetails, TMDBSeries, TMDBGenre } from "@/lib/tmdb";

interface RouteParams {
  params: Promise<{ tvId: string }>;
}

interface TVDetails extends TMDBSeries {
  genres: TMDBGenre[];
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  production_companies?: Array<{ id: number; name: string; logo_path: string | null }>;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  spoken_languages?: Array<{ english_name: string; iso_639_1: string; name: string }>;
  first_air_date: string;
  last_air_date?: string;
  status?: string;
  created_by?: Array<{ id: number; name: string; profile_path: string | null }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<TVDetails | { error: string }>> {
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
      setTimeout(() => reject(new Error("Request timeout")), 15000);
    });

    const detailsPromise = getTVDetails(tvIdNum);

    let details: TVDetails;
    try {
      details = await Promise.race([detailsPromise, timeoutPromise]);
    } catch (error) {
      console.warn("TV details timeout or error:", error);
      return NextResponse.json(
        { error: "Failed to fetch TV details" },
        { status: 500 }
      );
    }

    return NextResponse.json(details, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("TV details API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch TV details";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

