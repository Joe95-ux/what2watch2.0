import { NextRequest, NextResponse } from "next/server";
import { getTVWatchProviders, TMDBWatchProvidersResponse } from "@/lib/tmdb";

interface RouteParams {
  params: Promise<{ tvId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<TMDBWatchProvidersResponse | { error: string }>> {
  try {
    const { tvId } = await params;
    const tvIdNum = parseInt(tvId, 10);

    if (isNaN(tvIdNum)) {
      return NextResponse.json(
        { error: "Invalid TV ID" },
        { status: 400 }
      );
    }

    const providers = await getTVWatchProviders(tvIdNum);

    return NextResponse.json(providers, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("TV watch providers API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch watch providers";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

