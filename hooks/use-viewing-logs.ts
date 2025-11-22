import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateActivityParams } from "./use-activity";

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
    mutationFn: async (params: CreateViewingLogParams) => {
      const log = await createViewingLog(params);
      
      // Create activity for logging film
      try {
        await fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "LOGGED_FILM",
            tmdbId: params.tmdbId,
            mediaType: params.mediaType,
            title: params.title,
            posterPath: params.posterPath,
          }),
        });
      } catch (error) {
        // Silently fail - activity creation is not critical
        console.error("Failed to create activity:", error);
      }
      
      return log;
    },
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
    mutationFn: async (params: UpdateViewingLogParams) => {
      const log = await updateViewingLog(params);
      
      // Create activities for rating/reviewing if they changed
      // Note: We only create activities if rating/notes are being added for the first time
      // or significantly changed (to avoid spam)
      try {
        const currentLog = await fetch(`/api/viewing-logs/${params.logId}`).then(r => r.json()).catch(() => null);
        if (currentLog?.log) {
          const activities: CreateActivityParams[] = [];
          const previousRating = currentLog.log.rating;
          const previousNotes = currentLog.log.notes;
          
          // If rating was added (was null, now has value) or changed significantly (different value)
          if (params.rating !== undefined && params.rating !== null) {
            // Only create activity if rating is new or changed
            if (previousRating === null || previousRating !== params.rating) {
              activities.push({
                type: "RATED_FILM",
                tmdbId: currentLog.log.tmdbId,
                mediaType: currentLog.log.mediaType,
                title: currentLog.log.title,
                posterPath: currentLog.log.posterPath,
                rating: params.rating,
              });
            }
          }
          
          // If notes were added (was empty/null, now has content)
          if (params.notes !== undefined && params.notes && params.notes.trim().length > 0) {
            // Only create activity if notes are new (previous notes were empty/null)
            if (!previousNotes || previousNotes.trim().length === 0) {
              activities.push({
                type: "REVIEWED_FILM",
                tmdbId: currentLog.log.tmdbId,
                mediaType: currentLog.log.mediaType,
                title: currentLog.log.title,
                posterPath: currentLog.log.posterPath,
              });
            }
          }
          
          // Create activities
          for (const activity of activities) {
            await fetch("/api/activity", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(activity),
            });
          }
        }
      } catch (error) {
        // Silently fail - activity creation is not critical
        console.error("Failed to create activity:", error);
      }
      
      return log;
    },
    onSuccess: () => {
      // Invalidate viewing logs queries
      queryClient.invalidateQueries({ queryKey: ["viewing-logs"] });
    },
  });
}

