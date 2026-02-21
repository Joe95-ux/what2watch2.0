import { NextRequest, NextResponse } from "next/server";
import { getJustWatchRecommendations } from "@/lib/justwatch";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; tmdbId: string }> }
) {
  try {
    const { type, tmdbId: tmdbIdStr } = await params;
    
    if (type !== "movie" && type !== "tv") {
      return NextResponse.json(
        { error: "Invalid type. Must be 'movie' or 'tv'" },
        { status: 400 }
      );
    }
    
    const validType = type as "movie" | "tv";
    let country = request.nextUrl.searchParams.get("country") ?? "US";
    
    if (country.length < 2) {
      country = "US";
    } else {
      country = country.toUpperCase().slice(0, 2);
    }
    
    const tmdbId = Number(tmdbIdStr);
    if (!tmdbId || Number.isNaN(tmdbId)) {
      return NextResponse.json({ error: "Invalid TMDB id" }, { status: 400 });
    }

    const recommendations = await getJustWatchRecommendations(validType, tmdbId, country);

    return NextResponse.json(recommendations, {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[JustWatch Recommendations API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
