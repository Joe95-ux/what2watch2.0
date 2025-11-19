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
    let country = request.nextUrl.searchParams.get("country") ?? "US";
    
    // Validate and normalize country code
    if (country.length < 2) {
      console.warn(`[JustWatch API] Invalid country code: "${country}", defaulting to "US"`);
      country = "US";
    } else {
      country = country.toUpperCase().slice(0, 2);
    }
    
    const tmdbId = Number(tmdbIdStr);

    if (!tmdbId || Number.isNaN(tmdbId)) {
      console.error(`[JustWatch API] Invalid TMDB id: ${tmdbIdStr}`);
      return NextResponse.json({ error: "Invalid TMDB id" }, { status: 400 });
    }

    // Check if API key is configured
    if (!process.env.JUSTWATCH_API_KEY) {
      console.error("[JustWatch API] JUSTWATCH_API_KEY is not configured");
      return NextResponse.json(
        { error: "JustWatch API key not configured" },
        { status: 503 }
      );
    }

    // Debug logging
    console.log("[JustWatch API] Request:", { type, tmdbId, country });
    
    const data = await getJustWatchAvailability(type, tmdbId, country);

    if (!data) {
      console.error("[JustWatch API] No data returned from getJustWatchAvailability");
      return NextResponse.json(
        { error: "JustWatch data unavailable. Check server logs for details." },
        { status: 502 }
      );
    }

    console.log("[JustWatch API] Successfully returning data");
    console.log("[JustWatch API] Response summary:", {
      country: data.country,
      offerCount: data.allOffers.length,
      offerTypes: Object.keys(data.offersByType).filter(
        (key) => data.offersByType[key as keyof typeof data.offersByType].length > 0
      ),
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=900, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("[JustWatch API] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch JustWatch data";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[JustWatch API] Error stack:", errorStack);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}

