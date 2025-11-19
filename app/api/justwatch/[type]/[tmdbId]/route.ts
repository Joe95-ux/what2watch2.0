import { NextRequest, NextResponse } from "next/server";
import { getJustWatchAvailability } from "@/lib/justwatch";

interface RouteParams {
  params: {
    type: "movie" | "tv";
    tmdbId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const country = request.nextUrl.searchParams.get("country") ?? "US";
  const tmdbId = Number(params.tmdbId);

  if (!tmdbId || Number.isNaN(tmdbId)) {
    return NextResponse.json({ error: "Invalid TMDB id" }, { status: 400 });
  }

  const data = await getJustWatchAvailability(params.type, tmdbId, country);

  if (!data) {
    return NextResponse.json({ error: "JustWatch data unavailable" }, { status: 502 });
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "s-maxage=900, stale-while-revalidate=60",
    },
  });
}

