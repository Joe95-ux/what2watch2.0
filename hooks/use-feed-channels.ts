import { useQuery } from "@tanstack/react-query";

export interface FeedChannel {
  id: string;
  userId: string;
  channelId: string;
  slug?: string | null;
  title?: string;
  thumbnail?: string;
  channelUrl?: string;
  isFavorite?: boolean;
  createdAt: string;
}

interface FeedChannelsResponse {
  channels: FeedChannel[];
  count: number;
}

/**
 * Fetch user's feed channels (all channels in their feed, not just favorites)
 */
async function fetchFeedChannels(): Promise<FeedChannel[]> {
  const response = await fetch("/api/youtube/channels/pool");
  if (!response.ok) {
    throw new Error("Failed to fetch feed channels");
  }
  const data: FeedChannelsResponse = await response.json();
  return data.channels || [];
}

/**
 * Hook to fetch user's feed channels
 * Returns all channels in the user's feed (FavoriteChannel records)
 */
export function useFeedChannels() {
  return useQuery({
    queryKey: ["feed-channels"],
    queryFn: fetchFeedChannels,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

