import { useQuery } from "@tanstack/react-query";
import { YouTubeVideo } from "./use-youtube-channel";

interface SearchResponse {
  videos: YouTubeVideo[];
  nextPageToken?: string;
  hasMore: boolean;
  totalResults: number;
}

async function searchYouTubeVideos(
  query: string,
  pageToken?: string
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    maxResults: "20",
  });
  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const response = await fetch(`/api/youtube/videos/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to search videos");
  }
  return response.json();
}

export function useYouTubeSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ["youtube-search", query],
    queryFn: () => searchYouTubeVideos(query),
    enabled: enabled && query.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

