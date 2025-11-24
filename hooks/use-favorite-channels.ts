import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface FavoriteChannel {
  id: string;
  userId: string;
  channelId: string;
  slug?: string | null;
  title?: string;
  thumbnail?: string;
  channelUrl?: string;
  createdAt: string;
}

interface FavoriteChannelsResponse {
  favorites: FavoriteChannel[];
}

/**
 * Fetch user's favorite channels
 */
async function fetchFavoriteChannels(): Promise<FavoriteChannel[]> {
  const response = await fetch("/api/youtube/channels/favorites");
  if (!response.ok) {
    throw new Error("Failed to fetch favorite channels");
  }
  const data: FavoriteChannelsResponse = await response.json();
  return data.favorites || [];
}

/**
 * Like/Favorite a channel
 */
async function favoriteChannel(channelId: string): Promise<FavoriteChannel> {
  const response = await fetch(`/api/youtube/channels/${channelId}/favorite`, {
    method: "POST",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to favorite channel");
  }
  const data = await response.json();
  return data.favorite;
}

/**
 * Unlike/Unfavorite a channel
 */
async function unfavoriteChannel(channelId: string): Promise<void> {
  const response = await fetch(`/api/youtube/channels/${channelId}/favorite`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to unfavorite channel");
  }
}

/**
 * Hook to fetch favorite channels
 */
export function useFavoriteChannels() {
  return useQuery({
    queryKey: ["favorite-channels"],
    queryFn: fetchFavoriteChannels,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to favorite a channel
 */
export function useFavoriteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: favoriteChannel,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["favorite-channels"] });
    },
  });
}

/**
 * Hook to unfavorite a channel
 */
export function useUnfavoriteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unfavoriteChannel,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["favorite-channels"] });
    },
  });
}

/**
 * Hook to check if a channel is favorited and toggle it
 */
export function useToggleFavoriteChannel() {
  const { data: favorites = [] } = useFavoriteChannels();
  const favorite = useFavoriteChannel();
  const unfavorite = useUnfavoriteChannel();

  return {
    isFavorited: (channelId: string) => {
      return favorites.some((fav) => fav.channelId === channelId);
    },
    toggle: async (channelId: string) => {
      const isFavorited = favorites.some((fav) => fav.channelId === channelId);
      if (isFavorited) {
        await unfavorite.mutateAsync(channelId);
      } else {
        await favorite.mutateAsync(channelId);
      }
    },
    isLoading: favorite.isPending || unfavorite.isPending,
  };
}

