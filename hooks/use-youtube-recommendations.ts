import { useQuery } from "@tanstack/react-query";
import { YouTubeVideo } from "./use-youtube-channel";
import { YouTubeChannel } from "./use-youtube-channels";

interface RecommendationsPagination {
  page: number;
  pageSize: number;
  totalVideos: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface RecommendationsResponse {
  recommendedVideos: YouTubeVideo[];
  recommendedChannels: YouTubeChannel[];
  pagination?: RecommendationsPagination;
  message?: string;
}

async function fetchRecommendations(page = 1): Promise<RecommendationsResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
  });
  const response = await fetch(`/api/youtube/recommendations?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch recommendations");
  }
  return response.json();
}

export function useYouTubeRecommendations(page = 1) {
  return useQuery({
    queryKey: ["youtube-recommendations", page],
    queryFn: () => fetchRecommendations(page),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

