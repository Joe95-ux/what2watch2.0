import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

interface Favorite {
  id: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  createdAt: string;
}

// Fetch user's favorites
const fetchFavorites = async (): Promise<Favorite[]> => {
  const res = await fetch("/api/favorites");
  if (!res.ok) throw new Error("Failed to fetch favorites");
  const data = await res.json();
  return data.favorites || [];
};

// Add a favorite
const addFavorite = async (item: {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string;
  firstAirDate?: string;
}): Promise<Favorite> => {
  const res = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error("Failed to add favorite");
  const data = await res.json();
  return data.favorite;
};

// Remove a favorite
const removeFavorite = async (tmdbId: number, mediaType: "movie" | "tv"): Promise<void> => {
  const res = await fetch(`/api/favorites?tmdbId=${tmdbId}&mediaType=${mediaType}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to remove favorite");
};

// Update preferences after favorite change
const updatePreferences = async (): Promise<void> => {
  await fetch("/api/user/preferences/recalculate", {
    method: "POST",
  });
};

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: fetchFavorites,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addFavorite,
    onMutate: async (newFavorite) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["favorites"] });

      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData<Favorite[]>(["favorites"]);

      // Optimistically update to the new value
      queryClient.setQueryData<Favorite[]>(["favorites"], (old = []) => {
        // Check if already exists to avoid duplicates
        const exists = old.some(
          (f) => f.tmdbId === newFavorite.tmdbId && f.mediaType === newFavorite.mediaType
        );
        if (exists) return old;
        
        // Create optimistic favorite
        const optimisticFavorite: Favorite = {
          id: `temp-${Date.now()}`,
          tmdbId: newFavorite.tmdbId,
          mediaType: newFavorite.mediaType,
          title: newFavorite.title,
          posterPath: newFavorite.posterPath || null,
          backdropPath: newFavorite.backdropPath || null,
          releaseDate: newFavorite.releaseDate || null,
          firstAirDate: newFavorite.firstAirDate || null,
          createdAt: new Date().toISOString(),
        };
        return [...old, optimisticFavorite];
      });

      return { previousFavorites };
    },
    onError: (err, newFavorite, context) => {
      // Rollback on error
      if (context?.previousFavorites) {
        queryClient.setQueryData(["favorites"], context.previousFavorites);
      }
    },
    onSuccess: async () => {
      // Invalidate to get fresh data
      await queryClient.invalidateQueries({ queryKey: ["favorites"] });
      
      // Update preferences in the background (don't wait for it)
      updatePreferences().catch(console.error);
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tmdbId, mediaType }: { tmdbId: number; mediaType: "movie" | "tv" }) =>
      removeFavorite(tmdbId, mediaType),
    onMutate: async ({ tmdbId, mediaType }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["favorites"] });

      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData<Favorite[]>(["favorites"]);

      // Optimistically update to remove the favorite
      queryClient.setQueryData<Favorite[]>(["favorites"], (old = []) => {
        return old.filter(
          (f) => !(f.tmdbId === tmdbId && f.mediaType === mediaType)
        );
      });

      return { previousFavorites };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousFavorites) {
        queryClient.setQueryData(["favorites"], context.previousFavorites);
      }
    },
    onSuccess: async () => {
      // Invalidate to get fresh data
      await queryClient.invalidateQueries({ queryKey: ["favorites"] });
      
      // Update preferences in the background (don't wait for it)
      updatePreferences().catch(console.error);
    },
  });
}

export function useToggleFavorite() {
  const { data: favorites = [] } = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  return {
    isFavorite: (tmdbId: number, mediaType: "movie" | "tv") => {
      return favorites.some(
        (f) => f.tmdbId === tmdbId && f.mediaType === mediaType
      );
    },
    toggle: async (item: TMDBMovie | TMDBSeries, type: "movie" | "tv") => {
      const tmdbId = item.id;
      const isCurrentlyFavorite = favorites.some(
        (f) => f.tmdbId === tmdbId && f.mediaType === type
      );

      if (isCurrentlyFavorite) {
        await removeFavorite.mutateAsync({ tmdbId, mediaType: type });
      } else {
        const title = "title" in item ? item.title : item.name;
        const releaseDate = type === "movie" ? (item as TMDBMovie).release_date : undefined;
        const firstAirDate = type === "tv" ? (item as TMDBSeries).first_air_date : undefined;

        await addFavorite.mutateAsync({
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
    isLoading: addFavorite.isPending || removeFavorite.isPending,
  };
}

