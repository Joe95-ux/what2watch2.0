import { useQuery, useMutation } from "@tanstack/react-query";

export interface FormatAnalysis {
  format: string;
  videoCount: number;
  avgViews: number;
  avgEngagement: number;
  topVideos: Array<{
    videoId: string;
    title: string;
    thumbnail?: string;
    viewCount: number;
    engagementRate: number;
  }>;
}

export interface FormatRecommendation {
  format: string;
  videoCount: number;
  avgEngagement: number;
  avgViews: string;
  recommendationScore: number;
}

interface FormatAnalysisResponse {
  keyword: string;
  formatAnalysis: FormatAnalysis[];
  totalVideos: number;
}

interface FormatRecommendationsResponse {
  recommendations: FormatRecommendation[];
  keyword?: string;
  category?: string;
}

async function analyzeFormats(keyword: string, limit: number = 20): Promise<FormatAnalysisResponse> {
  const response = await fetch(`/api/youtube/formats/analyze?keyword=${encodeURIComponent(keyword)}&limit=${limit}`);
  if (!response.ok) {
    throw new Error("Failed to analyze formats");
  }
  return response.json();
}

async function getFormatRecommendations(keyword?: string, category?: string): Promise<FormatRecommendationsResponse> {
  const params = new URLSearchParams();
  if (keyword) params.set("keyword", keyword);
  if (category) params.set("category", category);
  
  const response = await fetch(`/api/youtube/formats/recommendations?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to get format recommendations");
  }
  return response.json();
}

async function classifyVideos(videoIds: string[]): Promise<{ classifications: any[]; total: number }> {
  const response = await fetch("/api/youtube/formats/classify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ videoIds }),
  });
  if (!response.ok) {
    throw new Error("Failed to classify videos");
  }
  return response.json();
}

export function useFormatAnalysis(keyword: string | null, limit: number = 20, enabled: boolean = true) {
  return useQuery({
    queryKey: ["format-analysis", keyword, limit],
    queryFn: () => analyzeFormats(keyword!, limit),
    enabled: enabled && !!keyword,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useFormatRecommendations(keyword?: string, category?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["format-recommendations", keyword, category],
    queryFn: () => getFormatRecommendations(keyword, category),
    enabled: enabled && !!keyword,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useClassifyVideos() {
  return useMutation({
    mutationFn: classifyVideos,
  });
}
