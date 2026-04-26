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

export interface WatchedTitle {
  id: string;
  userId: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  seenAt: string;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

// Unified log entry that can represent both ViewingLog and EpisodeViewingLog entries
export interface UnifiedViewingLog {
  id: string;
  watchedAt: string;
  rating?: number | null;
  notes?: string | null;
  tags?: string[];
  type: "viewingLog" | "episodeLog";
  // For viewingLog entries
  viewingLogId?: string;
  title?: string;
  // For episodeLog entries
  episodeLogId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeNumbers?: number[]; // For grouped episodes (episode numbers, not IDs)
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

const fetchWatchedTitles = async (): Promise<WatchedTitle[]> => {
  const res = await fetch("/api/watched-titles");
  if (!res.ok) throw new Error("Failed to fetch watched titles");
  const data = await res.json();
  return data.titles;
};

const markWatchedTitle = async (params: {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
}): Promise<void> => {
  const res = await fetch("/api/watched-titles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...params,
      seenAt: new Date().toISOString(),
      source: "manual_seen",
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Failed to mark watched");
  }
};

const unwatchTitle = async (watchedTitleId: string): Promise<void> => {
  const res = await fetch(`/api/watched-titles?id=${encodeURIComponent(watchedTitleId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Failed to unwatch title");
  }
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

// Fetch viewing logs for a specific movie/TV show
const fetchViewingLogsByContent = async (tmdbId: number, mediaType: "movie" | "tv"): Promise<UnifiedViewingLog[]> => {
  const res = await fetch(`/api/viewing-logs/by-content?tmdbId=${tmdbId}&mediaType=${mediaType}`);
  if (!res.ok) throw new Error("Failed to fetch viewing logs");
  const data = await res.json();
  return data.logs;
};

// Hook to fetch viewing logs
export function useViewingLogs(limit?: number, orderBy: "watchedAt" | "createdAt" = "watchedAt", order: "asc" | "desc" = "desc") {
  return useQuery<ViewingLog[]>({
    queryKey: ["viewing-logs", limit, orderBy, order],
    queryFn: () => fetchViewingLogs(limit, orderBy, order),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useWatchedTitles() {
  return useQuery<WatchedTitle[]>({
    queryKey: ["watched-titles"],
    queryFn: fetchWatchedTitles,
    staleTime: 1000 * 60 * 5,
  });
}

// Hook to fetch viewing logs for a specific movie/TV show (returns unified logs including episodes)
export function useViewingLogsByContent(tmdbId: number | null, mediaType: "movie" | "tv" | null) {
  return useQuery<UnifiedViewingLog[]>({
    queryKey: ["viewing-logs-by-content", tmdbId, mediaType],
    queryFn: () => fetchViewingLogsByContent(tmdbId!, mediaType!),
    enabled: !!tmdbId && !!mediaType,
  });
}

// Hook to create a viewing log
export function useLogViewing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateViewingLogParams) => {
      // Activity is created in the API route, no need to create it here
      const log = await createViewingLog(params);
      return log;
    },
    onSuccess: () => {
      // Invalidate viewing logs queries
      queryClient.invalidateQueries({ queryKey: ["viewing-logs"] });
      queryClient.invalidateQueries({ queryKey: ["viewing-logs-by-content"] });
      queryClient.invalidateQueries({ queryKey: ["watched-titles"] });
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
interface UpdateEpisodeViewingLogParams {
  logId: string;
  watchedAt?: string;
}

export function useUpdateEpisodeViewingLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateEpisodeViewingLogParams) => {
      const res = await fetch(`/api/episode-viewing-logs/${params.logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          watchedAt: params.watchedAt,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update episode viewing log");
      }

      return await res.json();
    },
    onSuccess: () => {
      // Invalidate viewing logs queries
      queryClient.invalidateQueries({ queryKey: ["viewing-logs"] });
      queryClient.invalidateQueries({ queryKey: ["viewing-logs-by-content"] });
    },
  });
}

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

// Check if a film is watched (has a viewing log)
const checkIsWatched = async (tmdbId: number, mediaType: "movie" | "tv"): Promise<{ isWatched: boolean; logId: string | null }> => {
  const res = await fetch(`/api/watched-titles/check?tmdbId=${tmdbId}&mediaType=${mediaType}`);
  if (!res.ok) return { isWatched: false, logId: null };
  const data = await res.json();
  return { isWatched: data.isWatched || false, logId: data.logId || null };
};

// Hook to check if a film is watched
export function useIsWatched(
  tmdbId: number | null,
  mediaType: "movie" | "tv",
  enabled: boolean = true
) {
  return useQuery<{ isWatched: boolean; logId: string | null }>({
    queryKey: ["is-watched", tmdbId, mediaType],
    queryFn: () => checkIsWatched(tmdbId!, mediaType),
    enabled: !!tmdbId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Hook for quick watch (one-click mark as watched with today's date)
export function useQuickWatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      tmdbId: number;
      mediaType: "movie" | "tv";
      title: string;
      posterPath?: string | null;
      backdropPath?: string | null;
      releaseDate?: string | null;
      firstAirDate?: string | null;
    }) => {
      // Mark as seen should not create a diary entry.
      await markWatchedTitle(params);
      return null;
    },
    onMutate: async (params) => {
      const { tmdbId, mediaType } = params;
      const key = ["is-watched", tmdbId, mediaType] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ isWatched: boolean; logId: string | null }>(key);
      queryClient.setQueryData(key, { isWatched: true, logId: "optimistic" });
      return { previous, key };
    },
    onError: (_err, _params, context) => {
      if (!context?.key) return;
      if (context.previous !== undefined) {
        queryClient.setQueryData(context.key, context.previous);
      } else {
        queryClient.removeQueries({ queryKey: context.key });
      }
    },
    onSuccess: () => {
      // Invalidate watched status queries.
      queryClient.invalidateQueries({ queryKey: ["is-watched"] });
      queryClient.invalidateQueries({ queryKey: ["watched-titles"] });
    },
  });
}

// Hook to unwatch (delete the most recent log for a film)
export function useUnwatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId: string) => {
      await unwatchTitle(logId);
    },
    onMutate: async (logId) => {
      await queryClient.cancelQueries({ queryKey: ["is-watched"] });
      const previousSnapshots: { queryKey: readonly unknown[]; data: { isWatched: boolean; logId: string | null } }[] = [];
      const all = queryClient.getQueriesData<{ isWatched: boolean; logId: string | null }>({
        queryKey: ["is-watched"],
      });
      for (const [queryKey, data] of all) {
        if (data?.logId === logId) {
          previousSnapshots.push({ queryKey, data: { ...data } });
          queryClient.setQueryData(queryKey, { isWatched: false, logId: null });
        }
      }
      return { previousSnapshots };
    },
    onError: (_err, _logId, context) => {
      context?.previousSnapshots?.forEach(({ queryKey, data }) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: () => {
      // Invalidate watched status queries
      queryClient.invalidateQueries({ queryKey: ["is-watched"] });
      queryClient.invalidateQueries({ queryKey: ["watched-titles"] });
    },
  });
}

