import { NextRequest, NextResponse } from "next/server";
import { getTVSeasonDetails, TMDBTVSeasonDetails } from "@/lib/tmdb";

interface RouteParams {
  params: Promise<{ tvId: string; seasonNumber: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<TMDBTVSeasonDetails | { error: string }>> {
  try {
    const { tvId, seasonNumber } = await params;
    const tvIdNum = parseInt(tvId, 10);
    const seasonNum = parseInt(seasonNumber, 10);

    if (isNaN(tvIdNum) || isNaN(seasonNum)) {
      return NextResponse.json(
        { error: "Invalid TV ID or season number" },
        { status: 400 }
      );
    }

    // Add timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 15000);
    });

    const seasonPromise = getTVSeasonDetails(tvIdNum, seasonNum);

    let season: TMDBTVSeasonDetails;
    try {
      season = await Promise.race([seasonPromise, timeoutPromise]);
    } catch (error) {
      console.warn("TV season details timeout or error:", error);
      return NextResponse.json(
        { error: "Failed to fetch season details" },
        { status: 500 }
      );
    }

    return NextResponse.json(season, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("TV season details API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch season details";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

