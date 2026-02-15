import { NextRequest, NextResponse } from "next/server";
import { getJustWatchAvailability } from "@/lib/justwatch";

const MAX_ITEMS = 50;
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 150;
const RETRY_DELAY_MS = 250;
const MAX_ATTEMPTS = 2;

type Period = "1d" | "7d" | "30d";

export interface RanksBatchBody {
  country?: string;
  period?: Period;
  items: Array<{ type: "movie" | "tv"; id: number }>;
}

export interface RanksBatchResponse {
  map: Record<string, { position: number; delta: number | null }>;
}

/** Fetch rank for one title with a single retry on failure. No extra work when the first attempt succeeds. */
async function fetchRankOnce(
  type: "movie" | "tv",
  id: number,
  country: string,
  period: Period
): Promise<{ position: number; delta: number | null } | null> {
  const jw = await getJustWatchAvailability(type, id, country);
  const window = jw?.ranks?.[period];
  if (window && typeof window.rank === "number" && Number.isFinite(window.rank)) {
    return {
      position: window.rank,
      delta:
        typeof window.delta === "number" && Number.isFinite(window.delta) ? window.delta : null,
    };
  }
  return null;
}

async function fetchRankWithRetry(
  type: "movie" | "tv",
  id: number,
  country: string,
  period: Period
): Promise<{ position: number; delta: number | null } | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await fetchRankOnce(type, id, country, period);
      if (result !== null) return result;
      break; // No rank in response; don't retry
    } catch {
      if (attempt === MAX_ATTEMPTS) return null;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  return null;
}

/**
 * POST /api/justwatch/charts/ranks-batch
 * Body: { country?, period?, items: [{ type: "movie"|"tv", id: number }] }
 * Returns JustWatch streaming chart rank (position) and delta for each title for the given period.
 * Failed requests are retried once after a short delay to recover from rate limits or transient errors.
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

    for (let i = 0; i < slice.length; i += BATCH_SIZE) {
      if (i > 0) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      const batch = slice.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async ({ type, id }) => {
          const key = `${type}-${id}`;
          const result = await fetchRankWithRetry(type, id, country, period);
          if (result) map[key] = result;
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
