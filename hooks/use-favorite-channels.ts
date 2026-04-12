import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface FavoriteChannel {
  id: string;
  userId: string;
  channelId: string;
  slug?: string | null;
  title?: string;
  thumbnail?: string;
  channelUrl?: string;
  isFavorite?: boolean; // Whether this channel is favorited (vs just in feed)
  createdAt: string;
}

interface FavoriteChannelsResponse {
  favorites: FavoriteChannel[];
}

/**
 * Fetch user's favorite channels
 */
export async function fetchFavoriteChannels(): Promise<FavoriteChannel[]> {
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
  const response = await fetch(`/api/youtube/channels/${encodeURIComponent(channelId)}/favorite`, {
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
  const response = await fetch(`/api/youtube/channels/${encodeURIComponent(channelId)}/favorite`, {
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
    onMutate: async (channelId) => {
      await queryClient.cancelQueries({ queryKey: ["favorite-channels"] });
      const previous = queryClient.getQueryData<FavoriteChannel[]>(["favorite-channels"]);
      queryClient.setQueryData<FavoriteChannel[]>(["favorite-channels"], (old = []) => {
        if (old.some((f) => f.channelId === channelId)) return old;
        return [
          ...old,
          {
            id: `pending-${channelId}`,
            userId: "",
            channelId,
            isFavorite: true,
            createdAt: new Date().toISOString(),
          },
        ];
      });
      return { previous };
    },
    onError: (_err, _channelId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["favorite-channels"], context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["favorite-channels"] });
      await queryClient.invalidateQueries({ queryKey: ["feed-channels"] });
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
    onMutate: async (channelId) => {
      await queryClient.cancelQueries({ queryKey: ["favorite-channels"] });
      const previous = queryClient.getQueryData<FavoriteChannel[]>(["favorite-channels"]);
      queryClient.setQueryData<FavoriteChannel[]>(["favorite-channels"], (old = []) =>
        old.filter((f) => f.channelId !== channelId)
      );
      return { previous };
    },
    onError: (_err, _channelId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["favorite-channels"], context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["favorite-channels"] });
      await queryClient.invalidateQueries({ queryKey: ["feed-channels"] });
    },
  });
}

/**
 * Hook to check if a channel is favorited and toggle it
 */
export function useToggleFavoriteChannel() {
  const queryClient = useQueryClient();
  const { data: favorites = [] } = useFavoriteChannels();
  const favorite = useFavoriteChannel();
  const unfavorite = useUnfavoriteChannel();

  const getFavoritesList = () =>
    queryClient.getQueryData<FavoriteChannel[]>(["favorite-channels"]) ?? favorites;

  return {
    isFavorited: (channelId: string) => {
      return getFavoritesList().some((fav) => fav.channelId === channelId);
    },
    toggle: async (channelId: string) => {
      const isFavorited = getFavoritesList().some((fav) => fav.channelId === channelId);
      if (isFavorited) {
        await unfavorite.mutateAsync(channelId);
      } else {
        await favorite.mutateAsync(channelId);
      }
    },
    isLoading: favorite.isPending || unfavorite.isPending,
  };
}
