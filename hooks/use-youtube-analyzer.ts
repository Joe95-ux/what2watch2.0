import { useQuery, useMutation } from "@tanstack/react-query";

export interface VideoAnalysis {
  id: string;
  videoId: string;
  titleLength: number;
  hasQuestion: boolean;
  hasBrackets: boolean;
  hasNumber: boolean;
  wordCount: number;
  topWords: string[];
  hasFace: boolean;
  hasText: boolean;
  dominantColors: string[];
  brightness: number | null;
  estimatedCTR: number | null;
  viewCount: string;
  engagementRate: number;
  analyzedAt: Date;
}

export interface VideoAnalysisResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  publishedAt: string;
  analysis: VideoAnalysis | null;
}

export interface AggregateAnalysis {
  avgTitleLength: number;
  percentWithBrackets: number;
  percentWithNumbers: number;
  percentWithQuestions: number;
  totalVideos: number;
}

interface AnalyzeResponse {
  videos: VideoAnalysisResult[];
  aggregateAnalysis: AggregateAnalysis;
}

async function analyzeVideos(keyword: string, limit: number = 10): Promise<AnalyzeResponse> {
  const params = new URLSearchParams({
    keyword,
    limit: limit.toString(),
  });

  const response = await fetch(`/api/youtube/videos/analyze?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to analyze videos");
  }
  return response.json();
}

export function useYouTubeAnalyzer(keyword: string, limit: number = 10, enabled: boolean = true) {
  return useQuery({
    queryKey: ["youtube-analyzer", keyword, limit],
    queryFn: () => analyzeVideos(keyword, limit),
    enabled: enabled && keyword.trim().length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
