import { NextRequest, NextResponse } from "next/server";
import { getJustWatchSeasonAvailability } from "@/lib/justwatch";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tmdbId: string; seasonNumber: string }> }
) {
  try {
    const { tmdbId, seasonNumber } = await params;
    const tmdbIdNum = Number(tmdbId);
    const seasonNum = Number(seasonNumber);
    if (!tmdbIdNum || Number.isNaN(tmdbIdNum) || seasonNum < 0 || Number.isNaN(seasonNum)) {
      return NextResponse.json({ error: "Invalid tmdbId or seasonNumber" }, { status: 400 });
    }
    const country = request.nextUrl.searchParams.get("country") ?? "US";
    const countryCode = country.length >= 2 ? country.toUpperCase().slice(0, 2) : "US";

    const token = process.env.JUSTWATCH_TOKEN ?? process.env.JUSTWATCH_API_KEY;
    if (!token) {
      return NextResponse.json({ error: "JustWatch token not configured" }, { status: 503 });
    }

    const data = await getJustWatchSeasonAvailability(tmdbIdNum, seasonNum, countryCode);
    if (!data) {
      return NextResponse.json(
        { error: "Season availability not available" },
        { status: 404 }
      );
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[JustWatch Season API]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch season availability" },
      { status: 500 }
    );
  }
}
