import { useQuery } from "@tanstack/react-query";

export interface Benchmarks {
  avgViews: number;
  avgEngagement: number;
  avgUploadFrequency: number;
  medianViews: number;
  medianEngagement: number;
  p25Views: number;
  p75Views: number;
  p25Engagement: number;
  p75Engagement: number;
}

export interface BenchmarkComparison {
  channelId: string;
  channelMetrics: {
    avgViews: number;
    avgEngagement: number;
    uploadFrequency: number;
  };
  benchmarks: Benchmarks;
  comparison: {
    viewsPercentile: number;
    engagementPercentile: number;
    performanceScore: number;
    performanceTier: "excellent" | "good" | "average" | "below_average";
    viewsVsAverage: number;
    engagementVsAverage: number;
  };
  sampleSize: number;
}

interface BenchmarksResponse {
  benchmarks: Benchmarks;
  sampleSize: number;
  category?: string;
}

async function getBenchmarks(category?: string): Promise<BenchmarksResponse> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  
  const response = await fetch(`/api/youtube/benchmarks?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch benchmarks");
  }
  return response.json();
}

async function compareChannel(channelId: string, category?: string): Promise<BenchmarkComparison> {
  const params = new URLSearchParams();
  params.set("channelId", channelId);
  if (category) params.set("category", category);
  
  const response = await fetch(`/api/youtube/benchmarks/compare?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Failed to compare channel performance" }));
    throw new Error(errorData.error || "Failed to compare channel performance");
  }
  return response.json();
}

export function useBenchmarks(category?: string) {
  return useQuery({
    queryKey: ["performance-benchmarks", category],
    queryFn: () => getBenchmarks(category),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useBenchmarkComparison(channelId: string | null, category?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["benchmark-comparison", channelId, category],
    queryFn: () => compareChannel(channelId!, category),
    enabled: enabled && !!channelId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}
