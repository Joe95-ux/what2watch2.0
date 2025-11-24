import { useQuery } from "@tanstack/react-query";
import { YouTubeVideo } from "./use-youtube-channel";
import { YouTubeChannel } from "./use-youtube-channels";

interface RecommendationsResponse {
  recommendedVideos: YouTubeVideo[];
  recommendedChannels: YouTubeChannel[];
  message?: string;
}

async function fetchRecommendations(): Promise<RecommendationsResponse> {
  const response = await fetch("/api/youtube/recommendations");
  if (!response.ok) {
    throw new Error("Failed to fetch recommendations");
  }
  return response.json();
}

export function useYouTubeRecommendations() {
  return useQuery({
    queryKey: ["youtube-recommendations"],
    queryFn: fetchRecommendations,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

