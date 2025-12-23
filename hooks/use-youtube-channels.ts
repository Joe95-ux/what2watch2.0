import { useQuery } from "@tanstack/react-query";

export interface YouTubeChannel {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  customUrl?: string;
  subscriberCount?: string;
  videoCount?: string;
  channelUrl: string;
  slug?: string | null;
}

interface YouTubeChannelsResponse {
  channels: YouTubeChannel[];
}

/**
 * Fetch YouTube channel IDs from database
 */
async function fetchChannelIds(nollywoodOnly: boolean = false): Promise<string[]> {
  const url = nollywoodOnly 
    ? "/api/youtube/channels/list?nollywood=true"
    : "/api/youtube/channels/list";
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return data.channelIds || [];
}

/**
 * Fetch YouTube channel details by IDs
 */
async function fetchChannelsByIds(channelIds: string[]): Promise<YouTubeChannel[]> {
  if (!channelIds || channelIds.length === 0) {
    return [];
  }

  const response = await fetch(
    `/api/youtube/channels?channelIds=${channelIds.join(",")}`
  );
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch channels");
  }

  const data: YouTubeChannelsResponse = await response.json();
  return data.channels || [];
}

/**
 * Hook to fetch YouTube channels
 * First fetches channel IDs from database, then fetches channel details
 */
export function useYouTubeChannels(nollywoodOnly: boolean = false) {
  return useQuery({
    queryKey: ["youtube-channels", nollywoodOnly ? "nollywood" : "all"],
    queryFn: async () => {
      // First, get channel IDs from database
      const channelIds = await fetchChannelIds(nollywoodOnly);
      
      // If no channel IDs, return empty array
      if (channelIds.length === 0) {
        return [];
      }

      // Fetch channel details
      return fetchChannelsByIds(channelIds);
    },
    staleTime: 0, // Always consider data stale to allow immediate refetch after adding channels
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

