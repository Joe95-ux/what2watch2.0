import { NextRequest, NextResponse } from "next/server";
import { discoverMovies, discoverTV } from "@/lib/tmdb";
import type { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

const DEFAULT_COUNTRY = "US";
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/**
 * GET /api/justwatch/charts/items?country=US&providerId=8&limit=20
 * Returns the list of titles "popular on this provider" from TMDB only (no JustWatch calls).
 * Used with POST /api/justwatch/charts/ranks-batch to get ranks reliably (same batching as search page).
 */
export async function GET(request: NextRequest) {
  try {
    const country = request.nextUrl.searchParams.get("country") ?? DEFAULT_COUNTRY;
    const providerIdParam = request.nextUrl.searchParams.get("providerId");
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam
      ? Math.min(MAX_LIMIT, Math.max(1, parseInt(limitParam, 10) || DEFAULT_LIMIT))
      : DEFAULT_LIMIT;

    if (!providerIdParam) {
      return NextResponse.json({ error: "providerId is required" }, { status: 400 });
    }
    const providerId = parseInt(providerIdParam, 10);
    if (Number.isNaN(providerId) || providerId < 0) {
      return NextResponse.json({ error: "Invalid providerId" }, { status: 400 });
    }

    const watchRegion = country.toUpperCase().slice(0, 2);

    const [moviesRes, tvRes] = await Promise.all([
      discoverMovies({
        page: 1,
        sortBy: "popularity.desc",
        with_watch_providers: String(providerId),
        watch_region: watchRegion,
      }),
      discoverTV({
        page: 1,
        sortBy: "popularity.desc",
        with_watch_providers: String(providerId),
        watch_region: watchRegion,
      }),
    ]);

    const combined: Array<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" }> = [];
    const seen = new Set<string>();
    [...(moviesRes.results ?? []), ...(tvRes.results ?? [])].forEach((item) => {
      const key = `${"title" in item ? "movie" : "tv"}-${item.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push({
          item,
          type: "title" in item ? "movie" : "tv",
        });
      }
    });
    combined.sort((a, b) => (b.item.popularity ?? 0) - (a.item.popularity ?? 0));
    const entries = combined.slice(0, limit);

    return NextResponse.json(
      { entries, country: watchRegion },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=120" } }
    );
  } catch (error) {
    console.error("[JustWatch charts/items] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch chart items" },
      { status: 500 }
    );
  }
}
