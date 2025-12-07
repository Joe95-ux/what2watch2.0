import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type ActivityType = 
  | "LOGGED_FILM"
  | "RATED_FILM"
  | "REVIEWED_FILM"
  | "LIKED_FILM"
  | "CREATED_LIST"
  | "CREATED_PLAYLIST"
  | "FOLLOWED_USER";

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  tmdbId: number | null;
  mediaType: "movie" | "tv" | null;
  title: string | null;
  posterPath: string | null;
  listId: string | null;
  listName: string | null;
  followedUserId: string | null;
  rating: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  followedUser?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface CreateActivityParams {
  type: ActivityType;
  tmdbId?: number;
  mediaType?: "movie" | "tv";
  title?: string;
  posterPath?: string;
  listId?: string;
  listName?: string;
  followedUserId?: string;
  rating?: number;
  metadata?: Record<string, unknown>;
}

// Fetch activity feed
const fetchActivityFeed = async (
  type?: ActivityType,
  limit?: number,
  sortBy?: string,
  sortOrder?: "asc" | "desc",
  startDate?: string,
  endDate?: string,
  search?: string,
  groupBy?: "day" | "week" | "month",
  userId?: string
): Promise<{ activities: Activity[]; grouped?: Record<string, Activity[]>; total: number }> => {
  const params = new URLSearchParams();
  if (type) params.append("type", type);
  if (limit) params.append("limit", limit.toString());
  if (sortBy) params.append("sortBy", sortBy);
  if (sortOrder) params.append("sortOrder", sortOrder);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  if (search) params.append("search", search);
  if (groupBy) params.append("groupBy", groupBy);
  if (userId) params.append("userId", userId);

  const res = await fetch(`/api/activity?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch activity feed");
  const data = await res.json();
  return {
    activities: data.activities || [],
    grouped: data.grouped || undefined,
    total: data.total || 0,
  };
};

// Fetch list of users in activity feed (for filter dropdown)
const fetchActivityUsers = async (): Promise<Array<{ id: string; username: string | null; displayName: string | null; avatarUrl: string | null }>> => {
  const res = await fetch("/api/activity/users");
  if (!res.ok) throw new Error("Failed to fetch activity users");
  const data = await res.json();
  return data.users || [];
};

// Fetch user's public activity feed
const fetchUserActivity = async (
  userId: string,
  type?: ActivityType,
  limit?: number,
  sortBy?: string,
  sortOrder?: "asc" | "desc",
  startDate?: string,
  endDate?: string,
  search?: string,
  groupBy?: "day" | "week" | "month"
): Promise<{ activities: Activity[]; grouped?: Record<string, Activity[]>; total: number; privacy: { visibility: string; isOwnProfile: boolean; canViewAll: boolean } }> => {
  const params = new URLSearchParams();
  if (type) params.append("type", type);
  if (limit) params.append("limit", limit.toString());
  if (sortBy) params.append("sortBy", sortBy);
  if (sortOrder) params.append("sortOrder", sortOrder);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  if (search) params.append("search", search);
  if (groupBy) params.append("groupBy", groupBy);

  const res = await fetch(`/api/users/${userId}/activity?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch user activity");
  return res.json();
};

// Create an activity
const createActivity = async (params: CreateActivityParams): Promise<Activity> => {
  const res = await fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create activity");
  }
  const data = await res.json();
  return data.activity;
};

// Hook to fetch activity feed
export function useActivityFeed(
  type?: ActivityType,
  limit?: number,
  sortBy?: string,
  sortOrder?: "asc" | "desc",
  startDate?: string,
  endDate?: string,
  search?: string,
  groupBy?: "day" | "week" | "month",
  userId?: string
) {
  return useQuery<{ activities: Activity[]; grouped?: Record<string, Activity[]>; total: number }>({
    queryKey: ["activity-feed", type, limit, sortBy, sortOrder, startDate, endDate, search, groupBy, userId],
    queryFn: () => fetchActivityFeed(type, limit, sortBy, sortOrder, startDate, endDate, search, groupBy, userId),
    staleTime: 1000 * 60, // 1 minute
  });
}

// Hook to fetch users in activity feed (for filter)
export function useActivityUsers() {
  return useQuery<Array<{ id: string; username: string | null; displayName: string | null; avatarUrl: string | null }>>({
    queryKey: ["activity-users"],
    queryFn: fetchActivityUsers,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to fetch user's public activity feed
export function useUserActivity(
  userId: string,
  type?: ActivityType | "all",
  limit?: number,
  sortBy?: string,
  sortOrder?: "asc" | "desc",
  startDate?: string,
  endDate?: string,
  search?: string,
  groupBy?: "day" | "week" | "month"
) {
  return useQuery<{ activities: Activity[]; grouped?: Record<string, Activity[]>; total: number; privacy: { visibility: string; isOwnProfile: boolean; canViewAll: boolean } }>({
    queryKey: ["user-activity", userId, type, limit, sortBy, sortOrder, startDate, endDate, search, groupBy],
    queryFn: () => fetchUserActivity(userId, type === "all" ? undefined : type, limit, sortBy, sortOrder, startDate, endDate, search, groupBy),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Hook to create an activity
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      // Invalidate activity feed queries
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
    },
  });
}

