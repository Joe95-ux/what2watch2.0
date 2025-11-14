import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface User {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followedAt?: string;
  isFollowing?: boolean;
}

// Follow a user
export function useFollowUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to follow user");
      }
      return response.json();
    },
    onSuccess: (_, userId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["user", userId, "follow"] });
      queryClient.invalidateQueries({ queryKey: ["user", userId, "followers"] });
      queryClient.invalidateQueries({ queryKey: ["user", userId, "following"] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
      queryClient.invalidateQueries({ queryKey: ["followers"] });
    },
  });
}

// Unfollow a user
export function useUnfollowUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unfollow user");
      }
      return response.json();
    },
    onSuccess: (_, userId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["user", userId, "follow"] });
      queryClient.invalidateQueries({ queryKey: ["user", userId, "followers"] });
      queryClient.invalidateQueries({ queryKey: ["user", userId, "following"] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
      queryClient.invalidateQueries({ queryKey: ["followers"] });
      queryClient.invalidateQueries({ queryKey: ["playlists", "following"] });
    },
  });
}

// Check if current user is following a user
export function useIsFollowing(userId: string | null) {
  return useQuery<{ isFollowing: boolean }>({
    queryKey: ["user", userId, "follow"],
    queryFn: async () => {
      if (!userId) return { isFollowing: false };
      const response = await fetch(`/api/users/${userId}/follow`);
      if (!response.ok) {
        return { isFollowing: false };
      }
      return response.json();
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Get followers of a user
export function useUserFollowers(userId: string | null) {
  return useQuery<{ followers: User[] }>({
    queryKey: ["user", userId, "followers"],
    queryFn: async () => {
      if (!userId) return { followers: [] };
      const response = await fetch(`/api/users/${userId}/followers`);
      if (!response.ok) {
        throw new Error("Failed to fetch followers");
      }
      return response.json();
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Get users a user is following
export function useUserFollowing(userId: string | null) {
  return useQuery<{ following: User[] }>({
    queryKey: ["user", userId, "following"],
    queryFn: async () => {
      if (!userId) return { following: [] };
      const response = await fetch(`/api/users/${userId}/following`);
      if (!response.ok) {
        throw new Error("Failed to fetch following");
      }
      return response.json();
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Get current user's following list
export function useFollowing() {
  return useQuery<{ following: User[] }>({
    queryKey: ["following"],
    queryFn: async () => {
      const response = await fetch("/api/users/me/following");
      if (!response.ok) {
        throw new Error("Failed to fetch following");
      }
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// Get current user's followers list
export function useFollowers() {
  return useQuery<{ followers: User[] }>({
    queryKey: ["followers"],
    queryFn: async () => {
      const response = await fetch("/api/users/me/followers");
      if (!response.ok) {
        throw new Error("Failed to fetch followers");
      }
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

