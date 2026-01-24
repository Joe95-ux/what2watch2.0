import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface CommentQuestion {
  id: string;
  videoId: string;
  channelId: string;
  question: string;
  questionType: string | null;
  upvotes: number;
  replies: number;
  extractedAt: string;
}

export interface QuestionTrend {
  id: string;
  question: string;
  normalizedQuestion: string;
  frequency: number;
  videos: string[];
  avgUpvotes: number;
  category: string | null;
  trendScore: number;
  firstSeen: string;
  lastSeen: string;
}

interface ExtractQuestionsResponse {
  questions: CommentQuestion[];
  total: number;
  videoId: string;
  channelId: string;
}

interface QuestionTrendsResponse {
  trends: QuestionTrend[];
  total: number;
}

async function extractQuestions(videoId: string, maxComments: number = 100): Promise<ExtractQuestionsResponse> {
  const response = await fetch("/api/youtube/comments/extract-questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ videoId, maxComments }),
  });
  if (!response.ok) {
    throw new Error("Failed to extract questions");
  }
  return response.json();
}

async function getQuestionTrends(category?: string, limit: number = 20, minFrequency: number = 2): Promise<QuestionTrendsResponse> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  params.set("limit", limit.toString());
  params.set("minFrequency", minFrequency.toString());
  
  const response = await fetch(`/api/youtube/questions/trends?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch question trends");
  }
  return response.json();
}

async function aggregateQuestions(): Promise<{ message: string; trendsCreated: number; trendsUpdated: number }> {
  const response = await fetch("/api/youtube/questions/aggregate", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to aggregate questions");
  }
  return response.json();
}

export function useExtractQuestions(videoId: string | null, maxComments: number = 100, enabled: boolean = true) {
  return useQuery({
    queryKey: ["comment-questions", videoId, maxComments],
    queryFn: () => extractQuestions(videoId!, maxComments),
    enabled: enabled && !!videoId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useQuestionTrends(category?: string, limit: number = 20, minFrequency: number = 2) {
  return useQuery({
    queryKey: ["question-trends", category, limit, minFrequency],
    queryFn: () => getQuestionTrends(category, limit, minFrequency),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useAggregateQuestions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: aggregateQuestions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-trends"] });
    },
  });
}
