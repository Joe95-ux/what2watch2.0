import { useQuery } from "@tanstack/react-query";

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  bannerImage?: string;
  customUrl?: string;
  subscriberCount: string;
  videoCount: string;
  channelUrl: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;
  videoUrl: string;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  itemCount: number;
  playlistUrl: string;
}

interface YouTubeChannelResponse {
  channel: YouTubeChannel;
}

interface YouTubeVideosResponse {
  videos: YouTubeVideo[];
  nextPageToken?: string;
  hasMore: boolean;
  totalResults: number;
}

interface YouTubePlaylistsResponse {
  playlists: YouTubePlaylist[];
  nextPageToken?: string;
  hasMore: boolean;
  totalResults: number;
}

/**
 * Fetch YouTube channel details
 */
async function fetchChannel(channelId: string): Promise<YouTubeChannel> {
  const response = await fetch(`/api/youtube/channels/${channelId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch channel");
  }
  const data: YouTubeChannelResponse = await response.json();
  return data.channel;
}

/**
 * Fetch YouTube channel videos with pagination
 */
async function fetchChannelVideos(
  channelId: string,
  pageToken?: string
): Promise<YouTubeVideosResponse> {
  const params = new URLSearchParams();
  params.set("maxResults", "20");
  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const response = await fetch(
    `/api/youtube/channels/${channelId}/videos?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch videos");
  }
  return response.json();
}

/**
 * Hook to fetch YouTube channel details
 */
export function useYouTubeChannel(channelId: string | null) {
  return useQuery({
    queryKey: ["youtube-channel", channelId],
    queryFn: () => fetchChannel(channelId!),
    enabled: !!channelId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Fetch YouTube channel playlists
 */
async function fetchChannelPlaylists(
  channelId: string,
  pageToken?: string
): Promise<YouTubePlaylistsResponse> {
  const params = new URLSearchParams();
  params.set("maxResults", "50");
  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const response = await fetch(
    `/api/youtube/channels/${channelId}/playlists?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch playlists");
  }
  return response.json();
}

/**
 * Hook to fetch YouTube channel videos with pagination
 */
export function useYouTubeChannelVideos(
  channelId: string | null,
  pageToken?: string
) {
  return useQuery({
    queryKey: ["youtube-channel-videos", channelId, pageToken],
    queryFn: () => fetchChannelVideos(channelId!, pageToken),
    enabled: !!channelId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch YouTube channel playlists with pagination
 */
export function useYouTubeChannelPlaylists(
  channelId: string | null,
  pageToken?: string
) {
  return useQuery({
    queryKey: ["youtube-channel-playlists", channelId, pageToken],
    queryFn: () => fetchChannelPlaylists(channelId!, pageToken),
    enabled: !!channelId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

