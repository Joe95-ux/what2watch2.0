import { useQuery } from "@tanstack/react-query";

export interface PlaylistAnalyticsTotals {
  shares: number;
  visits: number;
  uniqueVisitors: number;
  totalEngagement: number;
  topPlaylist: {
    id: string;
    name: string;
    visits: number;
    shares: number;
  } | null;
}

export interface PlaylistAnalyticsTrendPoint {
  date: string;
  shares: number;
  visits: number;
}

export interface PlaylistAnalyticsLeaderboardEntry {
  playlistId: string;
  name: string;
  shares: number;
  visits: number;
  total: number;
  updatedAt: string | null;
}

export interface PlaylistAnalyticsSourceBreakdown {
  source: string;
  count: number;
}

export interface PlaylistAnalyticsSummary {
  totals: PlaylistAnalyticsTotals;
  trend: PlaylistAnalyticsTrendPoint[];
  leaderboard: PlaylistAnalyticsLeaderboardEntry[];
  sources: PlaylistAnalyticsSourceBreakdown[];
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

const fetchPlaylistAnalyticsSummary = async (
  params: Omit<AnalyticsParams, "enabled"> = {}
): Promise<PlaylistAnalyticsSummary> => {
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
    ? `/api/analytics/playlist-summary?${queryString}`
    : "/api/analytics/playlist-summary";

  const res = await fetch(endpoint);

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message =
      typeof errorBody.error === "string"
        ? errorBody.error
        : "Failed to load playlist analytics";
    throw new Error(message);
  }

  return res.json();
};

export function usePlaylistAnalytics(params: AnalyticsParams = {}) {
  const { range, startDate, endDate, enabled = true } = params;

  return useQuery({
    queryKey: ["playlist-analytics-summary", { range, startDate, endDate }],
    queryFn: () => fetchPlaylistAnalyticsSummary({ range, startDate, endDate }),
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  });
}


