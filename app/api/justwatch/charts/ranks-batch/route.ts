import { NextRequest, NextResponse } from "next/server";
import { getJustWatchAvailability } from "@/lib/justwatch";

const MAX_ITEMS = 50;
type Period = "1d" | "7d" | "30d";

export interface RanksBatchBody {
  country?: string;
  period?: Period;
  items: Array<{ type: "movie" | "tv"; id: number }>;
}

export interface RanksBatchResponse {
  map: Record<string, { position: number; delta: number | null }>;
}

/**
 * POST /api/justwatch/charts/ranks-batch
 * Body: { country?, period?, items: [{ type: "movie"|"tv", id: number }] }
 * Returns JustWatch streaming chart rank (position) and delta for each title for the given period.
 * Used by /search?watchProvider=x to show rank on every result card.
 *
 * Cost: One JustWatch API call (getJustWatchAvailability) per item, up to MAX_ITEMS (50).
 * Requests are batched (5 at a time with 150ms delay) to avoid rate limits. Response is cached
 * 15min (staleTime on client). Only runs when watchProvider is in the URL and results exist.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RanksBatchBody;
    const country = (body.country ?? "US").toUpperCase().slice(0, 2);
    const period = (body.period ?? "1d") as Period;
    if (!["1d", "7d", "30d"].includes(period)) {
      return NextResponse.json({ error: "period must be 1d, 7d, or 30d" }, { status: 400 });
    }
    const items = Array.isArray(body.items) ? body.items : [];
    const slice = items
      .filter((i) => i && (i.type === "movie" || i.type === "tv") && typeof i.id === "number" && i.id > 0)
      .slice(0, MAX_ITEMS);

    const map: Record<string, { position: number; delta: number | null }> = {};
    const BATCH_SIZE = 5;
    const BATCH_DELAY_MS = 150;

    for (let i = 0; i < slice.length; i += BATCH_SIZE) {
      if (i > 0) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      const batch = slice.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async ({ type, id }) => {
          const key = `${type}-${id}`;
          try {
            const jw = await getJustWatchAvailability(type, id, country);
            const window = jw?.ranks?.[period];
            if (window && typeof window.rank === "number" && Number.isFinite(window.rank)) {
              map[key] = {
                position: window.rank,
                delta:
                  typeof window.delta === "number" && Number.isFinite(window.delta) ? window.delta : null,
              };
            }
          } catch {
            // Per-title failure (e.g. rate limit): skip
          }
        })
      );
    }

    return NextResponse.json(
      { map } as RanksBatchResponse,
      { headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("[JustWatch ranks-batch] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch ranks" },
      { status: 500 }
    );
  }
}
