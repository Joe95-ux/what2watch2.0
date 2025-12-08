import { useQuery } from "@tanstack/react-query";

export interface AiAnalyticsSummary {
  totals: {
    totalQueries: number;
    recommendationQueries: number;
    informationQueries: number;
    totalResults: number;
    totalClicks: number;
    totalPlaylistAdds: number;
    averageResponseTime: number;
    uniqueSessions: number;
    // Token usage stats
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    averageTokens: number;
    averagePromptTokens: number;
    averageCompletionTokens: number;
  };
  trend: Array<{
    date: string;
    count: number;
  }>;
  topGenres: Array<{
    genreId: number;
    count: number;
  }>;
  topKeywords: Array<{
    keyword: string;
    count: number;
  }>;
  range: {
    start: string | null;
    end: string;
  };
}

export function useAiAnalytics(params?: { range?: number; startDate?: string; endDate?: string }) {
  return useQuery<AiAnalyticsSummary>({
    queryKey: ["ai-analytics", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.range) {
        searchParams.set("range", params.range.toString());
      }
      if (params?.startDate) {
        searchParams.set("startDate", params.startDate);
      }
      if (params?.endDate) {
        searchParams.set("endDate", params.endDate);
      }

      const response = await fetch(`/api/ai/analytics?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch AI analytics");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

