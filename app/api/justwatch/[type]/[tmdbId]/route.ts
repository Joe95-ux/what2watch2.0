import { NextRequest, NextResponse } from "next/server";
import { getJustWatchAvailability } from "@/lib/justwatch";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; tmdbId: string }> }
) {
  try {
    const { type, tmdbId: tmdbIdStr } = await params;
    
    // Validate type parameter
    if (type !== "movie" && type !== "tv") {
      return NextResponse.json(
        { error: "Invalid type. Must be 'movie' or 'tv'" },
        { status: 400 }
      );
    }
    
    // Type narrowing: type is now "movie" | "tv"
    const validType = type as "movie" | "tv";
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

    // Check if partner token is configured (JUSTWATCH_TOKEN or legacy JUSTWATCH_API_KEY)
    const token = process.env.JUSTWATCH_TOKEN ?? process.env.JUSTWATCH_API_KEY;
    if (!token) {
      console.error("[JustWatch API] JUSTWATCH_TOKEN is not configured");
      return NextResponse.json(
        { error: "JustWatch token not configured" },
        { status: 503 }
      );
    }

    // Debug logging
    console.log("[JustWatch API] Request:", { type: validType, tmdbId, country });
    
    const data = await getJustWatchAvailability(validType, tmdbId, country);

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
      leavingSoonCount: data.leavingSoon?.length ?? 0,
      leavingSoon: data.leavingSoon,
      hasRanks: !!data.ranks,
      hasUpcoming: !!data.upcoming && data.upcoming.length > 0,
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

