import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ChannelPoolResponse {
  message: string;
  inPool: boolean;
  channel?: unknown;
}

async function updateChannelPool(channelId: string, action: "add" | "remove"): Promise<ChannelPoolResponse> {
  const response = await fetch("/api/youtube/channels/pool", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channelId, action }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to update channel pool" }));
    throw new Error(error.error || "Failed to update channel pool");
  }

  return response.json();
}

export function useChannelPool() {
  const queryClient = useQueryClient();

  const addToPool = useMutation({
    mutationFn: (channelId: string) => updateChannelPool(channelId, "add"),
    onSuccess: (data) => {
      toast.success(data.message || "Channel added to your feed");
      // Invalidate channels queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["youtube-channels-all"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-channels"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add channel to your feed");
    },
  });

  const removeFromPool = useMutation({
    mutationFn: (channelId: string) => updateChannelPool(channelId, "remove"),
    onSuccess: (data) => {
      toast.success(data.message || "Channel removed from your feed");
      // Invalidate channels queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["youtube-channels-all"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-channels"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove channel from your feed");
    },
  });

  return {
    addToPool,
    removeFromPool,
  };
}

