import { useQuery } from "@tanstack/react-query";
import type { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import type { ChartEntry } from "@/components/browse/streaming-chart-row";
import type { RankDelta } from "@/components/browse/chart-rank-card";

export type ChartPeriod = "1d" | "7d" | "30d";

interface ChartEntryResponse {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  position: number;
  rank: number | null;
  delta: number | null;
}

interface ChartsResponse {
  entries: ChartEntryResponse[];
  country: string;
  period: string;
}

function deltaToRankDelta(delta: number | null): RankDelta {
  if (delta == null || delta === 0) return "same";
  return delta > 0 ? "up" : "down";
}

async function fetchChart(
  providerId: number,
  country: string,
  period: ChartPeriod,
  limit: number
): Promise<ChartEntry[]> {
  const params = new URLSearchParams({
    providerId: String(providerId),
    country: country.toUpperCase().slice(0, 2),
    period,
    limit: String(limit),
  });
  const res = await fetch(`/api/justwatch/charts?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch JustWatch chart");
  const data = (await res.json()) as ChartsResponse;
  return (data.entries ?? []).map((e) => ({
    item: e.item,
    type: e.type,
    position: e.position,
    delta: deltaToRankDelta(e.delta),
    deltaNumber: e.delta,
  }));
}

export function useJustWatchChart(
  providerId: number,
  options?: { country?: string; period?: ChartPeriod; limit?: number }
) {
  const country = options?.country ?? "US";
  const period = options?.period ?? "1d";
  const limit = options?.limit ?? 15;

  return useQuery({
    queryKey: ["justwatch-chart", providerId, country, period, limit],
    queryFn: () => fetchChart(providerId, country, period, limit),
    enabled: providerId > 0,
    staleTime: 1000 * 60 * 15, // 15 min (JustWatch data cached server-side)
    gcTime: 1000 * 60 * 60,
  });
}

/** Response from GET /api/justwatch/charts/items */
interface ChartItemsResponse {
  entries: Array<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" }>;
  country: string;
}

/**
 * Fetches chart items (TMDB only) then ranks via ranks-batch (same batching as search page).
 * Use this for the Rank Charts tab so all titles get ranks reliably, with loading state.
 */
export function useJustWatchChartWithBatch(
  providerId: number,
  options?: { country?: string; period?: ChartPeriod; limit?: number }
) {
  const country = options?.country ?? "US";
  const period = options?.period ?? "1d";
  const limit = options?.limit ?? 20;

  const itemsQuery = useQuery({
    queryKey: ["justwatch-chart-items", providerId, country, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        providerId: String(providerId),
        country: country.toUpperCase().slice(0, 2),
        limit: String(limit),
      });
      const res = await fetch(`/api/justwatch/charts/items?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch chart items");
      return (await res.json()) as ChartItemsResponse;
    },
    enabled: providerId > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  });

  const items: ChartItemsResponse["entries"] = itemsQuery.data?.entries ?? [];
  const ranksQuery = useQuery({
    queryKey: ["justwatch-ranks-batch", providerId, country, period, items.map((e) => `${e.type}-${e.item.id}`).join(",")],
    queryFn: async () => {
      const res = await fetch("/api/justwatch/charts/ranks-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country,
          period,
          items: items.map((e) => ({ type: e.type, id: e.item.id })),
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch ranks");
      const data = await res.json();
      return data.map as Record<string, { position: number; delta: number | null }>;
    },
    enabled: providerId > 0 && items.length > 0,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
  });

  const rankMap = ranksQuery.data ?? {};
  const entries: ChartEntry[] = items.map((e) => {
    const key = `${e.type}-${e.item.id}`;
    const info = rankMap[key];
    return {
      item: e.item,
      type: e.type,
      position: info?.position ?? null,
      delta: deltaToRankDelta(info?.delta ?? null),
      deltaNumber: info?.delta ?? null,
    };
  });

  return {
    data: entries,
    isLoading: itemsQuery.isLoading || (items.length > 0 && ranksQuery.isLoading),
    isFetching: itemsQuery.isFetching || ranksQuery.isFetching,
    error: itemsQuery.error ?? ranksQuery.error,
  };
}
