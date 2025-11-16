import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ViewingLog {
  id: string;
  userId: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  watchedAt: string; // ISO date string
  notes: string | null;
  rating: number | null; // 1-5 star rating
  tags: string[]; // Tags for grouping
  createdAt: string;
  updatedAt: string;
}

interface CreateViewingLogParams {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  firstAirDate?: string | null;
  watchedAt?: string; // ISO date string, defaults to now
  notes?: string | null;
  rating?: number | null; // 1-5 star rating
  tags?: string[]; // Tags for grouping
}

interface UpdateViewingLogParams {
  logId: string;
  watchedAt?: string;
  notes?: string | null;
  rating?: number | null;
  tags?: string[]; // Tags for grouping
}

// Fetch viewing logs
const fetchViewingLogs = async (limit?: number, orderBy: "watchedAt" | "createdAt" = "watchedAt", order: "asc" | "desc" = "desc"): Promise<ViewingLog[]> => {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());
  params.append("orderBy", orderBy);
  params.append("order", order);

  const res = await fetch(`/api/viewing-logs?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch viewing logs");
  const data = await res.json();
  return data.logs;
};

// Create viewing log
const createViewingLog = async (params: CreateViewingLogParams): Promise<ViewingLog> => {
  const res = await fetch("/api/viewing-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create viewing log");
  }
  const data = await res.json();
  return data.log;
};

// Delete viewing log
const deleteViewingLog = async (logId: string): Promise<void> => {
  const res = await fetch(`/api/viewing-logs/${logId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete viewing log");
  }
};

// Update viewing log
const updateViewingLog = async (params: UpdateViewingLogParams): Promise<ViewingLog> => {
  const { logId, ...updateData } = params;
  const res = await fetch(`/api/viewing-logs/${logId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update viewing log");
  }
  const data = await res.json();
  return data.log;
};

// Hook to fetch viewing logs
export function useViewingLogs(limit?: number, orderBy: "watchedAt" | "createdAt" = "watchedAt", order: "asc" | "desc" = "desc") {
  return useQuery<ViewingLog[]>({
    queryKey: ["viewing-logs", limit, orderBy, order],
    queryFn: () => fetchViewingLogs(limit, orderBy, order),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to create a viewing log
export function useLogViewing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createViewingLog,
    onSuccess: () => {
      // Invalidate viewing logs queries
      queryClient.invalidateQueries({ queryKey: ["viewing-logs"] });
    },
  });
}

// Hook to delete a viewing log
export function useDeleteViewingLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteViewingLog,
    onSuccess: () => {
      // Invalidate viewing logs queries
      queryClient.invalidateQueries({ queryKey: ["viewing-logs"] });
    },
  });
}

// Hook to update a viewing log
export function useUpdateViewingLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateViewingLog,
    onSuccess: () => {
      // Invalidate viewing logs queries
      queryClient.invalidateQueries({ queryKey: ["viewing-logs"] });
    },
  });
}

