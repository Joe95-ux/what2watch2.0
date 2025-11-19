import { NextRequest, NextResponse } from "next/server";
import { getJustWatchAvailability } from "@/lib/justwatch";

interface RouteParams {
  params: Promise<{
    type: "movie" | "tv";
    tmdbId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { type, tmdbId: tmdbIdStr } = await params;
    const country = request.nextUrl.searchParams.get("country") ?? "US";
    const tmdbId = Number(tmdbIdStr);

    if (!tmdbId || Number.isNaN(tmdbId)) {
      return NextResponse.json({ error: "Invalid TMDB id" }, { status: 400 });
    }

    const data = await getJustWatchAvailability(type, tmdbId, country);

    // Debug logging
    console.log("[JustWatch API] Request:", { type, tmdbId, country });
    console.log("[JustWatch API] Response:", JSON.stringify(data, null, 2));

    if (!data) {
      console.log("[JustWatch API] No data returned");
      return NextResponse.json({ error: "JustWatch data unavailable" }, { status: 502 });
    }

    console.log("[JustWatch API] Successfully returning data");
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=900, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("JustWatch API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch JustWatch data";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

