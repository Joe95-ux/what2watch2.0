import { NextRequest, NextResponse } from "next/server";
import { getJustWatchAvailability } from "@/lib/justwatch";
import { discoverMovies, discoverTV } from "@/lib/tmdb";
import type { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

const DEFAULT_COUNTRY = "US";
const DEFAULT_PERIOD = "7d";
const MAX_LIMIT = 20;
const DEFAULT_LIMIT = 15;

type Period = "1d" | "7d" | "30d";

export interface ChartEntryResponse {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  position: number;
  /** JustWatch streaming chart rank for the chosen period (same as on details page). */
  rank: number | null;
  /** JustWatch rank change: positive = moved up, negative = moved down. */
  delta: number | null;
}

/**
 * GET /api/justwatch/charts?country=US&providerId=8&period=7d&limit=15
 * Returns chart entries for a provider: TMDB "popular on this provider" enriched with
 * JustWatch streaming chart rank and delta (1d/7d/30d) from the same API used on the details page.
 */
export async function GET(request: NextRequest) {
  try {
    const country = request.nextUrl.searchParams.get("country") ?? DEFAULT_COUNTRY;
    const providerIdParam = request.nextUrl.searchParams.get("providerId");
    const period = (request.nextUrl.searchParams.get("period") ?? DEFAULT_PERIOD) as Period;
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

    if (!["1d", "7d", "30d"].includes(period)) {
      return NextResponse.json({ error: "period must be 1d, 7d, or 30d" }, { status: 400 });
    }

    const watchRegion = country.toUpperCase().slice(0, 2);

    // 1. Get popular content on this provider from TMDB (movie + tv, combined by popularity)
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
    const slice = combined.slice(0, limit);

    // 2. Enrich each with JustWatch rank/delta for the chosen period (same as details page)
    const entries: ChartEntryResponse[] = await Promise.all(
      slice.map(async ({ item, type }, index) => {
        let rank: number | null = null;
        let delta: number | null = null;
        try {
          const jw = await getJustWatchAvailability(type, item.id, country);
          const window = jw?.ranks?.[period];
          if (window && typeof window.rank === "number" && Number.isFinite(window.rank)) {
            rank = window.rank;
            delta =
              typeof window.delta === "number" && Number.isFinite(window.delta) ? window.delta : null;
          }
        } catch (e) {
          // Per-title failure: keep rank/delta null
        }
        return {
          item,
          type,
          position: index + 1,
          rank,
          delta,
        };
      })
    );

    return NextResponse.json(
      { entries, country: watchRegion, period },
      {
        headers: {
          "Cache-Control": "s-maxage=900, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[JustWatch charts API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch chart" },
      { status: 500 }
    );
  }
}
