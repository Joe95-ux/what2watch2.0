import { NextRequest, NextResponse } from "next/server";
import { getMovieWatchProviders, TMDBWatchProvidersResponse } from "@/lib/tmdb";

interface RouteParams {
  params: Promise<{ movieId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<TMDBWatchProvidersResponse | { error: string }>> {
  try {
    const { movieId } = await params;
    const movieIdNum = parseInt(movieId, 10);

    if (isNaN(movieIdNum)) {
      return NextResponse.json(
        { error: "Invalid movie ID" },
        { status: 400 }
      );
    }

    const providers = await getMovieWatchProviders(movieIdNum);

    return NextResponse.json(providers, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("Movie watch providers API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch watch providers";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

