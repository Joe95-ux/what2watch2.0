import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Like a playlist
export function useLikePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (playlistId: string) => {
      const response = await fetch(`/api/playlists/${playlistId}/like`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to like playlist");
      }
      return response.json();
    },
    onSuccess: (_, playlistId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId, "like"] });
      queryClient.invalidateQueries({ queryKey: ["playlists", "liked"] });
      queryClient.invalidateQueries({ queryKey: ["playlists", "following"] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
}

// Unlike a playlist
export function useUnlikePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (playlistId: string) => {
      const response = await fetch(`/api/playlists/${playlistId}/like`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unlike playlist");
      }
      return response.json();
    },
    onSuccess: (_, playlistId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId, "like"] });
      queryClient.invalidateQueries({ queryKey: ["playlists", "liked"] });
      queryClient.invalidateQueries({ queryKey: ["playlists", "following"] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
}

// Check if current user has liked a playlist
export function useIsLiked(playlistId: string | null) {
  return useQuery<{ isLiked: boolean }>({
    queryKey: ["playlist", playlistId, "like"],
    queryFn: async () => {
      if (!playlistId) return { isLiked: false };
      const response = await fetch(`/api/playlists/${playlistId}/like`);
      if (!response.ok) {
        return { isLiked: false };
      }
      return response.json();
    },
    enabled: !!playlistId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Get playlists from users you follow
export function useFollowingPlaylists() {
  return useQuery({
    queryKey: ["playlists", "following"],
    queryFn: async () => {
      const response = await fetch("/api/playlists/following");
      if (!response.ok) {
        throw new Error("Failed to fetch following playlists");
      }
      const data = await response.json();
      return data.playlists || [];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// Get user's liked playlists
export function useLikedPlaylists() {
  return useQuery({
    queryKey: ["playlists", "liked"],
    queryFn: async () => {
      const response = await fetch("/api/playlists/liked");
      if (!response.ok) {
        throw new Error("Failed to fetch liked playlists");
      }
      const data = await response.json();
      return data.playlists || [];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

