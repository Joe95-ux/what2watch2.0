import { NextRequest, NextResponse } from "next/server";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb";

interface RouteParams {
  params: Promise<{ type: string; id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { type, id } = await params;
    const tmdbId = parseInt(id, 10);

    if (isNaN(tmdbId)) {
      return NextResponse.json(
        { error: "Invalid ID" },
        { status: 400 }
      );
    }

    if (type === "movie") {
      const details = await getMovieDetails(tmdbId);
      return NextResponse.json(details);
    } else if (type === "tv") {
      const details = await getTVDetails(tmdbId);
      return NextResponse.json(details);
    } else {
      return NextResponse.json(
        { error: "Invalid type. Must be 'movie' or 'tv'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error fetching TMDB details:", error);
    return NextResponse.json(
      { error: "Failed to fetch details" },
      { status: 500 }
    );
  }
}

