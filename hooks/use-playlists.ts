import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface YouTubePlaylistItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail?: string | null;
  description?: string | null;
  duration?: string | null;
  publishedAt?: string | null;
  channelId: string;
  channelTitle?: string | null;
  order: number;
  createdAt: string;
}

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
  youtubeItems?: YouTubePlaylistItem[];
  user?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  _count?: {
    items: number;
    youtubeItems?: number;
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
  note: string | null;
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
  items?: Array<{
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath?: string | null;
    backdropPath?: string | null;
    releaseDate?: string | null;
    firstAirDate?: string | null;
    order?: number;
  }>;
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
    items?: Array<{
      tmdbId: number;
      mediaType: "movie" | "tv";
      title: string;
      posterPath?: string | null;
      backdropPath?: string | null;
      releaseDate?: string | null;
      firstAirDate?: string | null;
      order?: number;
    }>;
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

// Reorder playlist items
const reorderPlaylistItems = async (
  playlistId: string, 
  items: Array<{ id: string; order: number }>,
  itemType: "tmdb" | "youtube" = "tmdb"
): Promise<void> => {
  const res = await fetch(`/api/playlists/${playlistId}/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, itemType }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to reorder playlist items");
  }
};

// Hook to reorder playlist items
export function useReorderPlaylist(playlistId: string, itemType: "tmdb" | "youtube" = "tmdb") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: Array<{ id: string; order: number }>) => {
      console.log("[useReorderPlaylist] Mutation function called:", {
        playlistId,
        itemType,
        itemsCount: items.length,
        firstFew: items.slice(0, 3).map(i => ({ id: i.id, order: i.order })),
        timestamp: new Date().toISOString(),
      });
      return reorderPlaylistItems(playlistId, items, itemType);
    },

    onMutate: async (items) => {
      console.log("[useReorderPlaylist] onMutate called:", {
        playlistId,
        itemType,
        itemsCount: items.length,
        timestamp: new Date().toISOString(),
      });

      await queryClient.cancelQueries({ queryKey: ["playlist", playlistId] });

      const previous = queryClient.getQueryData<Playlist>(["playlist", playlistId]);
      if (!previous) {
        console.warn("[useReorderPlaylist] No previous playlist data found - skipping optimistic update");
        return { previousPlaylist: null };
      }

      const previousItemsCount = itemType === "tmdb" 
        ? (previous.items?.length || 0)
        : (previous.youtubeItems?.length || 0);

      console.log("[useReorderPlaylist] Previous playlist data:", {
        itemsCount: previous.items?.length || 0,
        youtubeItemsCount: previous.youtubeItems?.length || 0,
        previousItemsCount,
        hasItems: !!previous.items,
        hasYouTubeItems: !!previous.youtubeItems,
        itemsIsArray: Array.isArray(previous.items),
        itemsLength: previous.items?.length,
      });

      // If the cache has no items, skip optimistic update to avoid overwriting local state
      // The local state update already happened, and we don't want to overwrite it with empty data
      if (previousItemsCount === 0) {
        console.warn("[useReorderPlaylist] Cache has no items - skipping optimistic update to preserve local state", {
          itemType,
          previousItemsCount,
          itemsLength: previous.items?.length,
          youtubeItemsLength: previous.youtubeItems?.length,
        });
        return { previousPlaylist: previous };
      }

      // Safer deep clone
      const updated: Playlist = {
        ...previous,
        items: previous.items ? previous.items.map((i) => ({ ...i })) : [],
        youtubeItems: previous.youtubeItems
          ? previous.youtubeItems.map((y) => ({ ...y }))
          : [],
      };

      const orderMap = new Map(items.map(i => [i.id, i.order]));

      let hasValidUpdate = false;

      if (itemType === "tmdb" && updated.items && updated.items.length > 0) {
        updated.items = updated.items
          .map(item => ({
            ...item,
            order: orderMap.get(item.id) ?? item.order
          }))
          .sort((a, b) => a.order - b.order);
        
        hasValidUpdate = true;
        console.log("[useReorderPlaylist] Updated TMDB items:", {
          count: updated.items.length,
          firstFew: updated.items.slice(0, 3).map(i => ({ id: i.id, order: i.order })),
        });
      } else if (itemType === "tmdb") {
        console.warn("[useReorderPlaylist] Skipping TMDB update - no items or empty array", {
          hasItems: !!updated.items,
          itemsLength: updated.items?.length,
        });
      }

      if (itemType === "youtube" && updated.youtubeItems && updated.youtubeItems.length > 0) {
        updated.youtubeItems = updated.youtubeItems
          .map(item => ({
            ...item,
            order: orderMap.get(item.id) ?? item.order
          }))
          .sort((a, b) => a.order - b.order);
        
        hasValidUpdate = true;
        console.log("[useReorderPlaylist] Updated YouTube items:", {
          count: updated.youtubeItems.length,
          firstFew: updated.youtubeItems.slice(0, 3).map(i => ({ id: i.id, order: i.order })),
        });
      } else if (itemType === "youtube") {
        console.warn("[useReorderPlaylist] Skipping YouTube update - no items or empty array", {
          hasYouTubeItems: !!updated.youtubeItems,
          youtubeItemsLength: updated.youtubeItems?.length,
        });
      }

      // Only update query data if we actually have items to update
      if (hasValidUpdate) {
        queryClient.setQueryData(["playlist", playlistId], updated);
        console.log("[useReorderPlaylist] Query data updated optimistically");
      } else {
        console.warn("[useReorderPlaylist] Not updating query data - no valid items to update");
      }

      return { previousPlaylist: previous };
    },

    onError: (_err, _items, ctx) => {
      console.error("[useReorderPlaylist] Mutation error:", _err);
      if (ctx?.previousPlaylist) {
        console.log("[useReorderPlaylist] Reverting to previous playlist data");
        queryClient.setQueryData(["playlist", playlistId], ctx.previousPlaylist);
      }
    },

    onSuccess: () => {
      console.log("[useReorderPlaylist] Mutation successful, scheduling refetch in 500ms");
      // Delay refetch to prevent snap-back conflicts with optimistic updates
      setTimeout(() => {
        console.log("[useReorderPlaylist] Refetching playlist data from DB");
        queryClient.refetchQueries({ queryKey: ["playlist", playlistId] });
      }, 500);
    }
  });
}


// Update playlist item (note or order)
const updatePlaylistItem = async (
  playlistId: string,
  itemId: string,
  updates: { note?: string | null; order?: number }
): Promise<PlaylistItem> => {
  const res = await fetch(`/api/playlists/${playlistId}/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update playlist item");
  }
  const data = await res.json();
  return data.playlistItem;
};

// Hook to update playlist item
export function useUpdatePlaylistItemMutation(playlistId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: { note?: string | null; order?: number } }) =>
      updatePlaylistItem(playlistId, itemId, updates),
    onMutate: async ({ itemId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["playlist", playlistId] });

      const previousPlaylist = queryClient.getQueryData<Playlist>(["playlist", playlistId]);

      if (previousPlaylist && updates.order !== undefined) {
        // Optimistically reorder all items
        const allItems = [...(previousPlaylist.items || [])];
        const currentItem = allItems.find((i) => i.id === itemId);
        if (currentItem) {
          const currentIndex = allItems.findIndex((i) => i.id === itemId);
          const newIndex = updates.order - 1;
          const [movedItem] = allItems.splice(currentIndex, 1);
          allItems.splice(newIndex, 0, movedItem);
          // Create new array with updated orders (immutable update)
          const reorderedItems = allItems.map((item, idx) => ({
            ...item,
            order: idx + 1,
          }));
          allItems.length = 0;
          allItems.push(...reorderedItems);
        }

        queryClient.setQueryData<Playlist>(["playlist", playlistId], {
          ...previousPlaylist,
          items: allItems,
        });
      } else if (previousPlaylist && updates.note !== undefined) {
        // Optimistically update note
        const updatedItems = (previousPlaylist.items || []).map((item) =>
          item.id === itemId ? { ...item, note: updates.note ?? null } : item
        );
        queryClient.setQueryData<Playlist>(["playlist", playlistId], {
          ...previousPlaylist,
          items: updatedItems,
        });
      }

      return { previousPlaylist };
    },
    onError: (err, variables, context) => {
      if (context?.previousPlaylist) {
        queryClient.setQueryData(["playlist", playlistId], context.previousPlaylist);
      }
    },
    onSuccess: () => {
      // Delay invalidation to prevent snap-back conflicts with optimistic updates
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      }, 500);
    },
  });
}

// Update YouTube playlist item (order)
const updateYouTubePlaylistItem = async (
  playlistId: string,
  itemId: string,
  updates: { order: number }
): Promise<YouTubePlaylistItem> => {
  const res = await fetch(`/api/playlists/${playlistId}/youtube-items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update YouTube playlist item");
  }
  const data = await res.json();
  return data.youtubePlaylistItem;
};

// Hook to update YouTube playlist item
export function useUpdateYouTubePlaylistItemMutation(playlistId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: { order: number } }) =>
      updateYouTubePlaylistItem(playlistId, itemId, updates),
    onMutate: async ({ itemId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["playlist", playlistId] });

      const previousPlaylist = queryClient.getQueryData<Playlist>(["playlist", playlistId]);

      if (previousPlaylist && updates.order !== undefined) {
        // Optimistically reorder all YouTube items
        const allItems = [...(previousPlaylist.youtubeItems || [])];
        const currentItem = allItems.find((i) => i.id === itemId);
        if (currentItem) {
          const currentIndex = allItems.findIndex((i) => i.id === itemId);
          const newIndex = updates.order - 1;
          const [movedItem] = allItems.splice(currentIndex, 1);
          allItems.splice(newIndex, 0, movedItem);
          // Create new array with updated orders (immutable update)
          const reorderedItems = allItems.map((item, idx) => ({
            ...item,
            order: idx + 1,
          }));

          queryClient.setQueryData<Playlist>(["playlist", playlistId], {
            ...previousPlaylist,
            youtubeItems: reorderedItems,
          });
        }
      }

      return { previousPlaylist };
    },
    onError: (err, variables, context) => {
      if (context?.previousPlaylist) {
        queryClient.setQueryData(["playlist", playlistId], context.previousPlaylist);
      }
    },
    onSuccess: () => {
      // Delay invalidation to prevent snap-back conflicts with optimistic updates
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      }, 500);
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

