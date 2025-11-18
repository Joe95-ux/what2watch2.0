import { useQuery } from "@tanstack/react-query";

export interface ListAnalyticsTotals {
  shares: number;
  visits: number;
  comments: number;
  reactions: number;
  likes: number;
  uniqueVisitors: number;
  totalEngagement: number;
  topList: {
    id: string;
    name: string;
    visits: number;
    shares: number;
  } | null;
}

export interface ListAnalyticsTrendPoint {
  date: string;
  shares: number;
  visits: number;
}

export interface ListAnalyticsLeaderboardEntry {
  listId: string;
  name: string;
  shares: number;
  visits: number;
  total: number;
  updatedAt: string | null;
}

export interface ListAnalyticsSourceBreakdown {
  source: string;
  count: number;
}

export interface ListAnalyticsSummary {
  totals: ListAnalyticsTotals;
  trend: ListAnalyticsTrendPoint[];
  leaderboard: ListAnalyticsLeaderboardEntry[];
  sources: ListAnalyticsSourceBreakdown[];
  range: {
    start: string | null; // null means "all time"
    end: string;
  };
}

interface AnalyticsParams {
  range?: number | string;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

const fetchListAnalyticsSummary = async (
  params: Omit<AnalyticsParams, "enabled"> = {}
): Promise<ListAnalyticsSummary> => {
  const searchParams = new URLSearchParams();
  if (params.range !== undefined) {
    searchParams.set("range", params.range.toString());
  }
  if (params.startDate) {
    searchParams.set("startDate", params.startDate);
  }
  if (params.endDate) {
    searchParams.set("endDate", params.endDate);
  }

  const queryString = searchParams.toString();
  const endpoint = queryString
    ? `/api/analytics/list-summary?${queryString}`
    : "/api/analytics/list-summary";

  const res = await fetch(endpoint);

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message =
      typeof errorBody.error === "string"
        ? errorBody.error
        : "Failed to load list analytics";
    throw new Error(message);
  }

  return res.json();
};

export function useListAnalytics(params: AnalyticsParams = {}) {
  const { range, startDate, endDate, enabled = true } = params;

  return useQuery({
    queryKey: ["list-analytics-summary", { range, startDate, endDate }],
    queryFn: () => fetchListAnalyticsSummary({ range, startDate, endDate }),
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  });
}

