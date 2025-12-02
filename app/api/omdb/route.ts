import { NextRequest, NextResponse } from "next/server";
import { getOMDBFullData } from "@/lib/omdb";

/**
 * GET /api/omdb?imdbId=tt1234567
 * Fetches full OMDB data (ratings, awards, box office, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imdbId = searchParams.get("imdbId");

    if (!imdbId) {
      return NextResponse.json(
        { error: "imdbId is required" },
        { status: 400 }
      );
    }

    const omdbData = await getOMDBFullData(imdbId);

    if (!omdbData) {
      return NextResponse.json(
        { error: "Failed to fetch OMDB data" },
        { status: 404 }
      );
    }

    return NextResponse.json(omdbData, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("Error fetching OMDB data:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch OMDB data";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

