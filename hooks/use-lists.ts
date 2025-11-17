import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

export type ListVisibility = "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE";

export interface ListItem {
  id: string;
  listId: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  position: number;
  createdAt: string;
}

export interface List {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  visibility: ListVisibility;
  tags: string[];
  coverImage: string | null;
  blockedUsers?: string[];
  items: ListItem[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  _count?: {
    items: number;
    likedBy: number;
    comments: number;
  };
}

interface CreateListParams {
  name: string;
  description?: string;
  visibility?: ListVisibility;
  tags?: string[];
  items?: Array<{
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath?: string | null;
    backdropPath?: string | null;
    releaseDate?: string | null;
    firstAirDate?: string | null;
    position?: number;
  }>;
}

interface UpdateListParams {
  listId: string;
  name?: string;
  description?: string;
  visibility?: ListVisibility;
  tags?: string[];
  items?: Array<{
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath?: string | null;
    backdropPath?: string | null;
    releaseDate?: string | null;
    firstAirDate?: string | null;
    position?: number;
  }>;
}

// Fetch user's lists
const fetchLists = async (visibility?: string): Promise<List[]> => {
  const params = new URLSearchParams();
  if (visibility) params.append("visibility", visibility);

  const res = await fetch(`/api/lists?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch lists");
  const data = await res.json();
  return data.lists || [];
};

// Fetch a specific list
const fetchList = async (listId: string): Promise<List> => {
  const res = await fetch(`/api/lists/${listId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch list");
  }
  const data = await res.json();
  return data.list;
};

// Create a list
const createList = async (params: CreateListParams): Promise<List> => {
  const res = await fetch("/api/lists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create list");
  }
  const data = await res.json();
  return data.list;
};

// Update a list
const updateList = async (params: UpdateListParams): Promise<List> => {
  const { listId, ...updateData } = params;
  const res = await fetch(`/api/lists/${listId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update list");
  }
  const data = await res.json();
  return data.list;
};

// Delete a list
const deleteList = async (listId: string): Promise<void> => {
  const res = await fetch(`/api/lists/${listId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete list");
  }
};

// Hook to fetch lists
export function useLists(visibility?: string) {
  return useQuery<List[]>({
    queryKey: ["lists", visibility],
    queryFn: () => fetchLists(visibility),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to fetch a specific list
export function useList(listId: string | null) {
  return useQuery<List>({
    queryKey: ["list", listId],
    queryFn: () => fetchList(listId!),
    enabled: !!listId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to create a list
export function useCreateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["public-lists"] });
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
    },
  });
}

// Hook to update a list
export function useUpdateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateList,
    onSuccess: (data) => {
      queryClient.setQueryData(["list", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["list", data.id] });
      queryClient.invalidateQueries({ queryKey: ["public-lists"] });
    },
  });
}

// Hook to delete a list
export function useDeleteList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}

