import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  visibility?: "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE";
  coverImage: string | null;
  likesCount?: number;
  createdAt: string;
  updatedAt: string;
  items?: PlaylistItem[];
  user?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  _count?: {
    items: number;
  };
  isReadOnly?: boolean;
  createdBy?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  order: number;
  createdAt: string;
}

// Fetch user's playlists
const fetchPlaylists = async (includePublic: boolean = false): Promise<Playlist[]> => {
  const res = await fetch(`/api/playlists?includePublic=${includePublic}`);
  if (!res.ok) throw new Error("Failed to fetch playlists");
  const data = await res.json();
  return data.playlists || [];
};

// Fetch a single playlist
const fetchPlaylist = async (playlistId: string): Promise<{ playlist: Playlist; currentUserId?: string }> => {
  const res = await fetch(`/api/playlists/${playlistId}`);
  if (!res.ok) throw new Error("Failed to fetch playlist");
  const data = await res.json();
  return { playlist: data.playlist, currentUserId: data.currentUserId };
};

// Create a playlist
const createPlaylist = async (playlist: {
  name: string;
  description?: string;
  isPublic?: boolean;
  coverImage?: string;
}): Promise<Playlist> => {
  const res = await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(playlist),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create playlist");
  }
  const data = await res.json();
  return data.playlist;
};

// Update a playlist
const updatePlaylist = async (
  playlistId: string,
  updates: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    coverImage?: string;
  }
): Promise<Playlist> => {
  const res = await fetch(`/api/playlists/${playlistId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update playlist");
  }
  const data = await res.json();
  return data.playlist;
};

// Delete a playlist
const deletePlaylist = async (playlistId: string): Promise<void> => {
  const res = await fetch(`/api/playlists/${playlistId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete playlist");
  }
};

// Add item to playlist
const addItemToPlaylist = async (
  playlistId: string,
  item: {
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath?: string | null;
    backdropPath?: string | null;
    releaseDate?: string;
    firstAirDate?: string;
  }
): Promise<PlaylistItem> => {
  const res = await fetch(`/api/playlists/${playlistId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to add item to playlist");
  }
  const data = await res.json();
  return data.item;
};

// Remove item from playlist
const removeItemFromPlaylist = async (playlistId: string, itemId: string): Promise<void> => {
  const res = await fetch(`/api/playlists/${playlistId}/items?itemId=${itemId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to remove item from playlist");
  }
};

export function usePlaylists(includePublic: boolean = false) {
  return useQuery({
    queryKey: ["playlists", includePublic],
    queryFn: () => fetchPlaylists(includePublic),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

export function usePlaylist(playlistId: string) {
  return useQuery({
    queryKey: ["playlist", playlistId],
    queryFn: () => fetchPlaylist(playlistId),
    enabled: !!playlistId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    select: (data) => ({
      ...data.playlist,
      _currentUserId: data.currentUserId, // Attach current user ID to playlist for ownership checks
    }),
  });
}

export function useCreatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
}

export function useUpdatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, updates }: { playlistId: string; updates: Parameters<typeof updatePlaylist>[1] }) =>
      updatePlaylist(playlistId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlist", variables.playlistId] });
    },
  });
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
}

export function useAddItemToPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, item }: { playlistId: string; item: Parameters<typeof addItemToPlaylist>[1] }) =>
      addItemToPlaylist(playlistId, item),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlist", variables.playlistId] });
    },
  });
}

export function useRemoveItemFromPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, itemId }: { playlistId: string; itemId: string }) =>
      removeItemFromPlaylist(playlistId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlist", variables.playlistId] });
    },
  });
}

// Fetch public playlists (no authentication required)
const fetchPublicPlaylists = async (limit?: number): Promise<Playlist[]> => {
  const url = limit ? `/api/playlists/public?limit=${limit}` : "/api/playlists/public";
  const res = await fetch(url, {
    // Explicitly don't send credentials to ensure it works for unauthenticated users
    credentials: 'omit',
    cache: 'no-store', // Ensure fresh data
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to fetch public playlists: ${res.status}`);
  }
  const data = await res.json();
  return data.playlists || [];
};

export function usePublicPlaylists(limit?: number) {
  return useQuery({
    queryKey: ["public-playlists", limit],
    queryFn: () => fetchPublicPlaylists(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 2, // Retry failed requests
    retryOnMount: true, // Retry when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

