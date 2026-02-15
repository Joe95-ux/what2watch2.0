import { NextRequest, NextResponse } from "next/server";
import { getJustWatchAvailability } from "@/lib/justwatch";
import { discoverMovies, discoverTV } from "@/lib/tmdb";
import type { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

const DEFAULT_COUNTRY = "US";
const DEFAULT_PERIOD = "1d"; // 24h default
const MAX_LIMIT = 30;
const DEFAULT_LIMIT = 20;

type Period = "1d" | "7d" | "30d";

export interface ChartEntryResponse {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  /** JustWatch chart rank when available; null when not on chart. Display as-is (no forcing 1,2,3). */
  position: number | null;
  /** JustWatch streaming chart rank for the chosen period (same as on details page). */
  rank: number | null;
  /** JustWatch rank change: positive = moved up, negative = moved down. */
  delta: number | null;
}

/**
 * GET /api/justwatch/charts?country=US&providerId=8&period=1d|7d|30d&limit=20
 *
 * HOW RANK IS CALCULATED:
 * 1. We get a list of titles "popular on this provider" from TMDB (discover with watch_provider + region),
 *    and keep that TMDB popularity order (no re-sorting).
 * 2. For each title we call JustWatch getJustWatchAvailability(), which returns that title's
 *    global streaming chart rank (and delta) for the chosen period (1d/7d/30d).
 * 3. We show that JustWatch rank as-is on each card (position = rank). No forcing 1, 2, 3 so users
 *    don't interpret it as "provider chart rank"; when a title has no chart rank we pass null.
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

    // 2. Enrich each with JustWatch rank/delta for the chosen period (same as details page).
    // Process in small batches with a short delay between batches to avoid rate-limiting the JustWatch API
    // (which can drop or fail when hit with many concurrent requests; details page works because it does one call).
    const BATCH_SIZE = 5;
    const BATCH_DELAY_MS = 150;
    const entries: ChartEntryResponse[] = [];
    for (let i = 0; i < slice.length; i += BATCH_SIZE) {
      if (i > 0) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      const batch = slice.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async ({ item, type }) => {
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
            // Per-title failure (e.g. rate limit): keep rank/delta null
          }
          return {
            item,
            type,
            position: rank,
            rank,
            delta,
          };
        })
      );
      entries.push(...batchResults);
    }

    // Keep TMDB popularity order; do not re-sort by JustWatch rank (position = actual JW rank per card)

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
