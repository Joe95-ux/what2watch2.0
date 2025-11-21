import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ChannelWatchlistItem {
  id: string;
  userId: string;
  channelId: string;
  title?: string;
  thumbnail?: string;
  channelUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChannelWatchlistResponse {
  items: ChannelWatchlistItem[];
}

/**
 * Fetch user's channel watchlist
 */
async function fetchChannelWatchlist(): Promise<ChannelWatchlistItem[]> {
  const response = await fetch("/api/watchlist/channels");
  if (!response.ok) {
    throw new Error("Failed to fetch channel watchlist");
  }
  const data: ChannelWatchlistResponse = await response.json();
  return data.items || [];
}

/**
 * Add channel to watchlist
 */
async function addChannelToWatchlist(channelId: string): Promise<ChannelWatchlistItem> {
  const response = await fetch("/api/watchlist/channels", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channelId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add channel to watchlist");
  }
  const data = await response.json();
  return data.item;
}

/**
 * Remove channel from watchlist
 */
async function removeChannelFromWatchlist(channelId: string): Promise<void> {
  const response = await fetch(`/api/watchlist/channels/${channelId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to remove channel from watchlist");
  }
}

/**
 * Hook to fetch channel watchlist
 */
export function useChannelWatchlist() {
  return useQuery({
    queryKey: ["channel-watchlist"],
    queryFn: fetchChannelWatchlist,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to add channel to watchlist
 */
export function useAddChannelToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addChannelToWatchlist,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["channel-watchlist"] });
    },
  });
}

/**
 * Hook to remove channel from watchlist
 */
export function useRemoveChannelFromWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeChannelFromWatchlist,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["channel-watchlist"] });
    },
  });
}

/**
 * Hook to check if channel is in watchlist and toggle it
 */
export function useToggleChannelWatchlist() {
  const { data: items = [] } = useChannelWatchlist();
  const add = useAddChannelToWatchlist();
  const remove = useRemoveChannelFromWatchlist();

  return {
    isInWatchlist: (channelId: string) => {
      return items.some((item) => item.channelId === channelId);
    },
    toggle: async (channelId: string) => {
      const isInWatchlist = items.some((item) => item.channelId === channelId);
      if (isInWatchlist) {
        await remove.mutateAsync(channelId);
      } else {
        await add.mutateAsync(channelId);
      }
    },
    isLoading: add.isPending || remove.isPending,
  };
}

