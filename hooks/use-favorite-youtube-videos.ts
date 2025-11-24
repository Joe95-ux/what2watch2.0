"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface FavoriteYouTubeVideo {
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

export interface VideoMetadataPayload {
  id: string;
  title: string;
  thumbnail?: string | null;
  channelId: string;
  channelTitle?: string | null;
  duration?: string | null;
  videoUrl: string;
  description?: string | null;
  publishedAt?: string | null;
}

interface FavoritesResponse {
  favorites: FavoriteYouTubeVideo[];
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

async function fetchFavoriteVideos(): Promise<FavoriteYouTubeVideo[]> {
  const response = await fetch("/api/youtube/videos/favorites");
  if (!response.ok) {
    throw new Error("Failed to fetch favorite videos");
  }
  const data: FavoritesResponse = await response.json();
  return data.favorites ?? [];
}

async function favoriteVideo(video: VideoMetadataPayload): Promise<FavoriteYouTubeVideo> {
  const response = await fetch(`/api/youtube/videos/${video.id}/favorite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(serializeVideoPayload(video)),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to favorite video");
  }

  const data = await response.json();
  return data.favorite as FavoriteYouTubeVideo;
}

async function unfavoriteVideo(videoId: string): Promise<void> {
  const response = await fetch(`/api/youtube/videos/${videoId}/favorite`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to remove favorite video");
  }
}

export function useFavoriteYouTubeVideos() {
  return useQuery({
    queryKey: ["youtube-favorite-videos"],
    queryFn: fetchFavoriteVideos,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  });
}

export function useToggleFavoriteYouTubeVideo() {
  const queryClient = useQueryClient();
  const { data: favorites = [] } = useFavoriteYouTubeVideos();

  const addMutation = useMutation({
    mutationFn: favoriteVideo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["youtube-favorite-videos"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: unfavoriteVideo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["youtube-favorite-videos"] });
    },
  });

  const isFavorited = (videoId: string) => favorites.some((favorite) => favorite.videoId === videoId);

  return {
    favorites,
    isFavorited,
    toggle: async (video: VideoMetadataPayload) => {
      if (isFavorited(video.id)) {
        await removeMutation.mutateAsync(video.id);
      } else {
        await addMutation.mutateAsync(video);
      }
    },
    add: async (video: VideoMetadataPayload) => {
      await addMutation.mutateAsync(video);
    },
    isLoading: addMutation.isPending || removeMutation.isPending,
  };
}

export function useAddFavoriteYouTubeVideo() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: favoriteVideo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["youtube-favorite-videos"] });
      return;
    },
  });

  return {
    add: async (video: VideoMetadataPayload) => {
      await addMutation.mutateAsync(video);
    },
    isLoading: addMutation.isPending,
  };
}


