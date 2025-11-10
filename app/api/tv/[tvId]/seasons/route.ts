import { NextRequest, NextResponse } from "next/server";
import { getTVSeasons, TMDBTVSeason } from "@/lib/tmdb";

interface RouteParams {
  params: Promise<{ tvId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<{ id: number; seasons: TMDBTVSeason[] } | { error: string }>> {
  try {
    const { tvId } = await params;
    const tvIdNum = parseInt(tvId, 10);

    if (isNaN(tvIdNum)) {
      return NextResponse.json(
        { error: "Invalid TV ID" },
        { status: 400 }
      );
    }

    // Add timeout wrapper - increased to 45 seconds for slow TMDB responses
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 45000);
    });

    const seasonsPromise = getTVSeasons(tvIdNum);

    let seasons: { id: number; seasons: TMDBTVSeason[] };
    try {
      seasons = await Promise.race([seasonsPromise, timeoutPromise]);
    } catch (error) {
      console.warn("TV seasons timeout or error:", error);
      return NextResponse.json(
        { id: tvIdNum, seasons: [] },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
          },
        }
      );
    }

    return NextResponse.json(seasons, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("TV seasons API error:", error);
    return NextResponse.json(
      { id: 0, seasons: [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      }
    );
  }
}

