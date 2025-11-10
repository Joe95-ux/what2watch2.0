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
      // Handle 404 errors gracefully (season might not exist)
      if (error instanceof Error && error.message.includes('404')) {
        console.warn(`TV season ${seasonNum} not found for TV ${tvIdNum}`);
        return NextResponse.json(
          {
            id: 0,
            name: `Season ${seasonNum}`,
            overview: "",
            season_number: seasonNum,
            episodes: [],
            air_date: null,
            poster_path: null,
          },
          {
            status: 200,
            headers: {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
            },
          }
        );
      }
      console.warn("TV season details timeout or error:", error);
      return NextResponse.json(
        {
          id: 0,
          name: `Season ${seasonNum}`,
          overview: "",
          season_number: seasonNum,
          episodes: [],
          air_date: null,
          poster_path: null,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
          },
        }
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

