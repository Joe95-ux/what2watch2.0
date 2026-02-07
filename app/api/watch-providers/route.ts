import { NextRequest, NextResponse } from "next/server";
import { getWatchProvidersList, type TMDBWatchProviderItem } from "@/lib/tmdb";

const WATCH_REGION = "US";
const TOP_N_CAROUSELS = 5;
const MAX_PROVIDERS = 100;

/**
 * GET /api/watch-providers?region=US&limit=5|all
 * Returns watch providers (by display priority) for movies and TV combined.
 * limit=5 (default): first 5 for browse carousels.
 * limit=all: up to MAX_PROVIDERS for filter sidebar (show more/less).
 */
export async function GET(request: NextRequest): Promise<
  NextResponse<
    | { providers: Array<{ provider_id: number; provider_name: string; logo_path: string | null }> }
    | { error: string }
  >
> {
  try {
    const region = request.nextUrl.searchParams.get("region") || WATCH_REGION;
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limitAll = limitParam === "all";
    const topN = limitAll ? MAX_PROVIDERS : (limitParam ? parseInt(limitParam, 10) : TOP_N_CAROUSELS);
    const sliceTo = typeof topN === "number" && !Number.isNaN(topN) && topN > 0 ? topN : TOP_N_CAROUSELS;

    const [movieRes, tvRes] = await Promise.all([
      getWatchProvidersList("movie", region),
      getWatchProvidersList("tv", region),
    ]);

    const byId = new Map<
      number,
      { provider_name: string; logo_path: string | null; priority: number }
    >();

    const add = (item: TMDBWatchProviderItem) => {
      const priority = item.display_priorities?.[region] ?? item.display_priorities?.["US"] ?? 999;
      const existing = byId.get(item.provider_id);
      if (!existing || priority < existing.priority) {
        byId.set(item.provider_id, {
          provider_name: item.provider_name,
          logo_path: item.logo_path ?? null,
          priority,
        });
      }
    };

    movieRes.results.forEach(add);
    tvRes.results.forEach(add);

    const sorted = Array.from(byId.entries())
      .sort((a, b) => a[1].priority - b[1].priority)
      .slice(0, sliceTo)
      .map(([provider_id, v]) => ({
        provider_id,
        provider_name: v.provider_name,
        logo_path: v.logo_path,
      }));

    return NextResponse.json(
      { providers: sorted },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
    );
  } catch (error) {
    console.error("Watch providers API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch watch providers" },
      { status: 500 }
    );
  }
}
