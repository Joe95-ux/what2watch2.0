"use client";

import { useQuery } from "@tanstack/react-query";

export interface UserYouTubePlaylistPreview {
  id: string;
  name: string;
  description?: string | null;
  coverImage?: string | null;
  updatedAt: string;
  youtubeItemsCount: number;
  previewItems: Array<{
    id: string;
    videoId: string;
    title: string;
    thumbnail?: string | null;
    channelTitle?: string | null;
    duration?: string | null;
  }>;
}

interface YouTubePlaylistsResponse {
  playlists: {
    id: string;
    name: string;
    description?: string | null;
    coverImage?: string | null;
    updatedAt: string;
    _count: { youtubeItems: number };
    youtubeItems: Array<{
      id: string;
      videoId: string;
      title: string;
      thumbnail?: string | null;
      channelTitle?: string | null;
      duration?: string | null;
    }>;
  }[];
}

async function fetchUserYouTubePlaylists(): Promise<UserYouTubePlaylistPreview[]> {
  const response = await fetch("/api/youtube/playlists");
  if (!response.ok) {
    throw new Error("Failed to fetch YouTube playlists");
  }

  const data: YouTubePlaylistsResponse = await response.json();

  return (data.playlists ?? []).map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    coverImage: playlist.coverImage,
    updatedAt: playlist.updatedAt,
    youtubeItemsCount: playlist._count.youtubeItems,
    previewItems: playlist.youtubeItems,
  }));
}

export function useUserYouTubePlaylists() {
  return useQuery({
    queryKey: ["user-youtube-playlists"],
    queryFn: fetchUserYouTubePlaylists,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  });
}


