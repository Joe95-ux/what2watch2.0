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
const fetchActivityFeed = async (type?: ActivityType, limit?: number): Promise<Activity[]> => {
  const params = new URLSearchParams();
  if (type) params.append("type", type);
  if (limit) params.append("limit", limit.toString());

  const res = await fetch(`/api/activity?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch activity feed");
  const data = await res.json();
  return data.activities || [];
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
export function useActivityFeed(type?: ActivityType, limit?: number) {
  return useQuery<Activity[]>({
    queryKey: ["activity-feed", type, limit],
    queryFn: () => fetchActivityFeed(type, limit),
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

