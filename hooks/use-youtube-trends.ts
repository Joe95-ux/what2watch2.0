import { useQuery } from "@tanstack/react-query";

export interface YouTubeTrend {
  id: string;
  keyword: string;
  category?: string;
  searchVolume: number;
  videoCount: number;
  avgViews: string;
  avgEngagement: number;
  momentum: number;
  period: string;
  startDate: Date;
  endDate: Date;
}

interface TrendsResponse {
  trends: YouTubeTrend[];
  period: string;
  count: number;
}

async function fetchTrends(
  period: "daily" | "weekly" | "monthly" = "daily",
  limit: number = 20,
  category?: string,
  minMomentum: number = 0
): Promise<TrendsResponse> {
  const params = new URLSearchParams({
    period,
    limit: limit.toString(),
    minMomentum: minMomentum.toString(),
  });
  if (category) {
    params.set("category", category);
  }

  const response = await fetch(`/api/youtube/trends?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch trends");
  }
  return response.json();
}

export function useYouTubeTrends(
  period: "daily" | "weekly" | "monthly" = "daily",
  limit: number = 20,
  category?: string,
  minMomentum: number = 0
) {
  return useQuery({
    queryKey: ["youtube-trends", period, limit, category, minMomentum],
    queryFn: () => fetchTrends(period, limit, category, minMomentum),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
