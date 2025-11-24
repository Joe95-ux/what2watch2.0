"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { VideoMetadataPayload } from "./use-favorite-youtube-videos";

export interface YouTubeVideoWatchlistItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail?: string | null;
  channelId: string;
  channelTitle?: string | null;
  duration?: string | null;
  videoUrl: string;
  description?: string | null;
  publishedAt?: string | null;
  createdAt: string;
}

interface WatchlistResponse {
  watchlist: YouTubeVideoWatchlistItem[];
}

const serializeVideoPayload = (video: VideoMetadataPayload) => ({
  video: {
    id: video.id,
    title: video.title,
    thumbnail: video.thumbnail ?? null,
    channelId: video.channelId,
    channelTitle: video.channelTitle ?? null,
    duration: video.duration ?? null,
    videoUrl: video.videoUrl,
    description: video.description ?? null,
    publishedAt: video.publishedAt ?? null,
  },
});

async function fetchWatchlist(): Promise<YouTubeVideoWatchlistItem[]> {
  const response = await fetch("/api/youtube/videos/watchlist");
  if (!response.ok) {
    throw new Error("Failed to fetch watchlist");
  }
  const data: WatchlistResponse = await response.json();
  return data.watchlist ?? [];
}

async function addToWatchlist(video: VideoMetadataPayload): Promise<YouTubeVideoWatchlistItem> {
  const response = await fetch(`/api/youtube/videos/${video.id}/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serializeVideoPayload(video)),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to update watchlist");
  }

  const data = await response.json();
  return data.watchlistItem as YouTubeVideoWatchlistItem;
}

async function removeFromWatchlist(videoId: string): Promise<void> {
  const response = await fetch(`/api/youtube/videos/${videoId}/watchlist`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to update watchlist");
  }
}

export function useYouTubeVideoWatchlist() {
  return useQuery({
    queryKey: ["youtube-video-watchlist"],
    queryFn: fetchWatchlist,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  });
}

export function useToggleYouTubeVideoWatchlist() {
  const queryClient = useQueryClient();
  const { data: watchlist = [] } = useYouTubeVideoWatchlist();

  const addMutation = useMutation({
    mutationFn: addToWatchlist,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["youtube-video-watchlist"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFromWatchlist,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["youtube-video-watchlist"] });
    },
  });

  const isInWatchlist = (videoId: string) => watchlist.some((item) => item.videoId === videoId);

  return {
    watchlist,
    isInWatchlist,
    toggle: async (video: VideoMetadataPayload) => {
      if (isInWatchlist(video.id)) {
        await removeMutation.mutateAsync(video.id);
      } else {
        await addMutation.mutateAsync(video);
      }
    },
    isLoading: addMutation.isPending || removeMutation.isPending,
  };
}


