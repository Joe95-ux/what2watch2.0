import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

export interface WatchlistItem {
  id: string;
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
  updatedAt: string;
}

// Fetch user's watchlist
const fetchWatchlist = async (): Promise<WatchlistItem[]> => {
  const res = await fetch("/api/watchlist");
  if (!res.ok) throw new Error("Failed to fetch watchlist");
  const data = await res.json();
  return data.watchlist || [];
};

// Add to watchlist
const addToWatchlist = async (item: {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string;
  firstAirDate?: string;
}): Promise<WatchlistItem> => {
  const res = await fetch("/api/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to add to watchlist");
  }
  const data = await res.json();
  return data.watchlistItem;
};

// Remove from watchlist
const removeFromWatchlist = async (tmdbId: number, mediaType: "movie" | "tv"): Promise<void> => {
  const res = await fetch(`/api/watchlist?tmdbId=${tmdbId}&mediaType=${mediaType}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to remove from watchlist");
  }
};

export function useWatchlist() {
  return useQuery({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addToWatchlist,
    onMutate: async (newItem) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["watchlist"] });

      // Snapshot the previous value
      const previousWatchlist = queryClient.getQueryData<WatchlistItem[]>(["watchlist"]);

      // Optimistically update to the new value
      queryClient.setQueryData<WatchlistItem[]>(["watchlist"], (old = []) => {
        // Check if already exists to avoid duplicates
        const exists = old.some(
          (w) => w.tmdbId === newItem.tmdbId && w.mediaType === newItem.mediaType
        );
        if (exists) return old;
        
        // Create optimistic watchlist item
        const optimisticItem: WatchlistItem = {
          id: `temp-${Date.now()}`,
          tmdbId: newItem.tmdbId,
          mediaType: newItem.mediaType,
          title: newItem.title,
          posterPath: newItem.posterPath || null,
          backdropPath: newItem.backdropPath || null,
          releaseDate: newItem.releaseDate || null,
          firstAirDate: newItem.firstAirDate || null,
          order: 0,
          note: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return [...old, optimisticItem];
      });

      return { previousWatchlist };
    },
    onError: (err, newItem, context) => {
      // Rollback on error
      if (context?.previousWatchlist) {
        queryClient.setQueryData(["watchlist"], context.previousWatchlist);
      }
    },
    onSuccess: async () => {
      // Invalidate to get fresh data
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tmdbId, mediaType }: { tmdbId: number; mediaType: "movie" | "tv" }) =>
      removeFromWatchlist(tmdbId, mediaType),
    onMutate: async ({ tmdbId, mediaType }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["watchlist"] });

      // Snapshot the previous value
      const previousWatchlist = queryClient.getQueryData<WatchlistItem[]>(["watchlist"]);

      // Optimistically update to remove the item
      queryClient.setQueryData<WatchlistItem[]>(["watchlist"], (old = []) => {
        return old.filter(
          (w) => !(w.tmdbId === tmdbId && w.mediaType === mediaType)
        );
      });

      return { previousWatchlist };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousWatchlist) {
        queryClient.setQueryData(["watchlist"], context.previousWatchlist);
      }
    },
    onSuccess: async () => {
      // Invalidate to get fresh data
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}

export function useToggleWatchlist() {
  const { data: watchlist = [] } = useWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  return {
    isInWatchlist: (tmdbId: number, mediaType: "movie" | "tv") => {
      return watchlist.some(
        (w) => w.tmdbId === tmdbId && w.mediaType === mediaType
      );
    },
    toggle: async (item: TMDBMovie | TMDBSeries, type: "movie" | "tv") => {
      const tmdbId = item.id;
      const isCurrentlyInWatchlist = watchlist.some(
        (w) => w.tmdbId === tmdbId && w.mediaType === type
      );

      if (isCurrentlyInWatchlist) {
        await removeFromWatchlist.mutateAsync({ tmdbId, mediaType: type });
      } else {
        const title = "title" in item ? item.title : item.name;
        const releaseDate = type === "movie" ? (item as TMDBMovie).release_date : undefined;
        const firstAirDate = type === "tv" ? (item as TMDBSeries).first_air_date : undefined;

        await addToWatchlist.mutateAsync({
          tmdbId,
          mediaType: type,
          title,
          posterPath: item.poster_path,
          backdropPath: item.backdrop_path,
          releaseDate,
          firstAirDate,
        });
      }
    },
    isLoading: addToWatchlist.isPending || removeFromWatchlist.isPending,
  };
}

// Fetch watchlist public status
const fetchWatchlistPublicStatus = async (): Promise<boolean> => {
  const res = await fetch("/api/watchlist/public-status");
  if (!res.ok) throw new Error("Failed to fetch watchlist public status");
  const data = await res.json();
  return data.isPublic ?? true;
};

// Update watchlist public status
const updateWatchlistPublicStatus = async (isPublic: boolean): Promise<boolean> => {
  const res = await fetch("/api/watchlist/public-status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isPublic }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update watchlist public status");
  }
  const data = await res.json();
  return data.isPublic;
};

export function useWatchlistPublicStatus() {
  return useQuery({
    queryKey: ["watchlist-public-status"],
    queryFn: fetchWatchlistPublicStatus,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateWatchlistPublicStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateWatchlistPublicStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist-public-status"] });
    },
  });
}

// Reorder watchlist items
const reorderWatchlist = async (items: Array<{ id: string; order: number }>): Promise<void> => {
  const res = await fetch("/api/watchlist/reorder", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to reorder watchlist");
  }
};

// Update watchlist item note or order
const updateWatchlistItem = async (
  itemId: string,
  updates: { note?: string | null; order?: number }
): Promise<WatchlistItem> => {
  const res = await fetch(`/api/watchlist/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update watchlist item");
  }
  const data = await res.json();
  return data.watchlistItem;
};

export function useUpdateWatchlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: { note?: string | null; order?: number } }) =>
      updateWatchlistItem(itemId, updates),
    onMutate: async ({ itemId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["watchlist"] });

      // Snapshot the previous value
      const previousWatchlist = queryClient.getQueryData<WatchlistItem[]>(["watchlist"]);

      // Optimistically update
      queryClient.setQueryData<WatchlistItem[]>(["watchlist"], (old = []) => {
        if (!old || old.length === 0) return old;

        // If order is being updated, we need to shift other items
        if (updates.order !== undefined) {
          const currentItem = old.find((item) => item.id === itemId);
          if (!currentItem) return old;

          const oldOrder = currentItem.order || 0;
          const newOrder = updates.order;

          // If order hasn't changed, just update the item
          if (oldOrder === newOrder) {
            return old.map((item) => {
              if (item.id === itemId) {
                return {
                  ...item,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                };
              }
              return item;
            });
          }

          // Calculate new orders for all items (shift logic)
          const itemsToUpdate = new Map<string, number>();

          if (newOrder > oldOrder) {
            // Moving down: shift items between oldOrder and newOrder up by 1
            for (const item of old) {
              if (item.id === itemId) {
                itemsToUpdate.set(item.id, newOrder);
              } else if (item.order && item.order > oldOrder && item.order <= newOrder) {
                itemsToUpdate.set(item.id, item.order - 1);
              } else if (item.order) {
                itemsToUpdate.set(item.id, item.order);
              }
            }
          } else {
            // Moving up: shift items between newOrder and oldOrder down by 1
            for (const item of old) {
              if (item.id === itemId) {
                itemsToUpdate.set(item.id, newOrder);
              } else if (item.order && item.order >= newOrder && item.order < oldOrder) {
                itemsToUpdate.set(item.id, item.order + 1);
              } else if (item.order) {
                itemsToUpdate.set(item.id, item.order);
              }
            }
          }

          // Apply updates
          return old.map((item) => {
            const newOrderValue = itemsToUpdate.get(item.id);
            if (item.id === itemId) {
              return {
                ...item,
                ...updates,
                order: newOrderValue !== undefined ? newOrderValue : (updates.order ?? item.order ?? 0),
                updatedAt: new Date().toISOString(),
              };
            } else if (newOrderValue !== undefined && newOrderValue !== (item.order ?? 0)) {
              return {
                ...item,
                order: newOrderValue,
                updatedAt: new Date().toISOString(),
              };
            }
            return item;
          });
        }

        // Just update note or other fields
        return old.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              ...updates,
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        });
      });

      return { previousWatchlist };
    },
    onSuccess: async (data, variables) => {
      // If order was updated, we need to refetch to get all shifted items
      // Otherwise, just update the cache with the returned item
      if (variables.updates.order !== undefined) {
        // Order changes affect multiple items, so we need to refetch
        // Delay invalidation to prevent snap-back conflicts with optimistic updates
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["watchlist"] });
        }, 500);
      } else {
        // Just update the single item in cache
        queryClient.setQueryData<WatchlistItem[]>(["watchlist"], (old = []) => {
          return old.map((item) => {
            if (item.id === variables.itemId) {
              return data;
            }
            return item;
          });
        });
      }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousWatchlist) {
        queryClient.setQueryData(["watchlist"], context.previousWatchlist);
      }
    },
  });
}

export function useReorderWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reorderWatchlist,
    onMutate: async (itemsToUpdate) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["watchlist"] });

      // Snapshot the previous value
      const previousWatchlist = queryClient.getQueryData<WatchlistItem[]>(["watchlist"]);

      // Optimistically update the order values
      queryClient.setQueryData<WatchlistItem[]>(["watchlist"], (old = []) => {
        if (!old || old.length === 0) {
          return old;
        }
        
        const orderMap = new Map(itemsToUpdate.map((item) => [item.id, item.order]));
        
        const updated = old.map((item) => {
          const newOrder = orderMap.get(item.id);
          if (newOrder !== undefined) {
            return { ...item, order: newOrder, updatedAt: new Date().toISOString() };
          }
          return item;
        });

        return updated;
      });

      return { previousWatchlist };
    },
    onSuccess: async (_, itemsToUpdate) => {
      // Refetch immediately - optimistic update handles the UI, this ensures server state is synced
      queryClient.refetchQueries({ queryKey: ["watchlist"] });
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousWatchlist) {
        queryClient.setQueryData(["watchlist"], context.previousWatchlist);
      }
    },
  });
}

