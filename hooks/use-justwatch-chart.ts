import { useQuery } from "@tanstack/react-query";
import type { ChartEntry } from "@/components/browse/streaming-chart-row";
import type { RankDelta } from "@/components/browse/chart-rank-card";

export type ChartPeriod = "1d" | "7d" | "30d";

interface ChartEntryResponse {
  item: unknown;
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
  const period = options?.period ?? "7d";
  const limit = options?.limit ?? 15;

  return useQuery({
    queryKey: ["justwatch-chart", providerId, country, period, limit],
    queryFn: () => fetchChart(providerId, country, period, limit),
    enabled: providerId > 0,
    staleTime: 1000 * 60 * 15, // 15 min (JustWatch data cached server-side)
    gcTime: 1000 * 60 * 60,
  });
}
