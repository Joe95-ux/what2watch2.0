import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Check if episodes are seen
const checkSeenEpisodes = async (tvShowTmdbId: number): Promise<number[]> => {
  const res = await fetch(`/api/episodes/check?tvShowTmdbId=${tvShowTmdbId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch seen episodes");
  }
  const data = await res.json();
  return data.seenEpisodes || [];
};

// Hook to get seen episodes for a TV show
export function useSeenEpisodes(tvShowTmdbId: number | null) {
  return useQuery<number[]>({
    queryKey: tvShowTmdbId ? ["seen-episodes", tvShowTmdbId] : ["seen-episodes"],
    queryFn: () => {
      if (!tvShowTmdbId) return [];
      return checkSeenEpisodes(tvShowTmdbId);
    },
    enabled: !!tvShowTmdbId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to toggle episode seen status
export function useToggleEpisodeSeen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      tvShowTmdbId: number;
      tvShowTitle: string;
      episodeId: number;
      seasonNumber: number;
      episodeNumber: number;
      isSeen: boolean; // true = currently seen (will unmark), false = not seen (will mark)
    }) => {
      if (params.isSeen) {
        // Currently seen → unmark (DELETE)
        const res = await fetch(
          `/api/episodes/seen?tvShowTmdbId=${params.tvShowTmdbId}&episodeId=${params.episodeId}`,
          {
            method: "DELETE",
          }
        );
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to mark episode as not seen");
        }
        return await res.json();
      } else {
        // Not seen → mark (POST)
        const res = await fetch("/api/episodes/seen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tvShowTmdbId: params.tvShowTmdbId,
            tvShowTitle: params.tvShowTitle,
            episodeId: params.episodeId,
            seasonNumber: params.seasonNumber,
            episodeNumber: params.episodeNumber,
          }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to mark episode as seen");
        }
        return await res.json();
      }
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["seen-episodes", variables.tvShowTmdbId] });
      await queryClient.cancelQueries({ queryKey: ["seen-seasons", variables.tvShowTmdbId] });

      // Snapshot previous values
      const previousSeenEpisodes = queryClient.getQueryData<number[]>(["seen-episodes", variables.tvShowTmdbId]);
      const previousSeenSeasons = queryClient.getQueryData<number[]>(["seen-seasons", variables.tvShowTmdbId]);

      // Optimistically update seen episodes
      queryClient.setQueryData<number[]>(["seen-episodes", variables.tvShowTmdbId], (old = []) => {
        if (variables.isSeen) {
          // Removing from seen
          return old.filter(id => id !== variables.episodeId);
        } else {
          // Adding to seen
          return [...old, variables.episodeId];
        }
      });

      return { previousSeenEpisodes, previousSeenSeasons };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousSeenEpisodes !== undefined) {
        queryClient.setQueryData(["seen-episodes", variables.tvShowTmdbId], context.previousSeenEpisodes);
      }
      if (context?.previousSeenSeasons !== undefined) {
        queryClient.setQueryData(["seen-seasons", variables.tvShowTmdbId], context.previousSeenSeasons);
      }
      toast.error(error instanceof Error ? error.message : "Failed to update episode status");
    },
    onSuccess: (_, variables) => {
      console.log("[useToggleEpisodeSeen] onSuccess - invalidating queries for tvShow:", variables.tvShowTmdbId);
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["seen-episodes", variables.tvShowTmdbId] });
      queryClient.invalidateQueries({ queryKey: ["is-watched", variables.tvShowTmdbId, "tv"] });
      queryClient.refetchQueries({ queryKey: ["seen-seasons", variables.tvShowTmdbId] });
      console.log("[useToggleEpisodeSeen] Queries invalidated and refetched");
    },
  });
}

// Hook to mark seasons as seen
export function useMarkSeasonsSeen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      tvShowTmdbId: number;
      tvShowTitle: string;
      seasonNumbers: number[];
    }) => {
      const res = await fetch("/api/episodes/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to mark seasons as seen");
      }
      return await res.json();
    },
    onSuccess: (_, variables) => {
      console.log("[useMarkSeasonsSeen] onSuccess - invalidating queries for tvShow:", variables.tvShowTmdbId);
      // Invalidate seen episodes query
      queryClient.invalidateQueries({ queryKey: ["seen-episodes", variables.tvShowTmdbId] });
      // Also invalidate watched status for the TV show
      queryClient.invalidateQueries({ queryKey: ["is-watched", variables.tvShowTmdbId, "tv"] });
      // Refetch seen seasons check immediately
      queryClient.refetchQueries({ queryKey: ["seen-seasons", variables.tvShowTmdbId] });
      console.log("[useMarkSeasonsSeen] Queries invalidated and refetched");
      toast.success(`Marked ${variables.seasonNumbers.length} ${variables.seasonNumbers.length === 1 ? "season" : "seasons"} as seen`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to mark seasons as seen");
    },
  });
}

// Hook to unmark seasons as seen
export function useUnmarkSeasonsSeen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      tvShowTmdbId: number;
      seasonNumbers: number[];
    }) => {
      const res = await fetch(
        `/api/episodes/seasons?tvShowTmdbId=${params.tvShowTmdbId}&seasonNumbers=${params.seasonNumbers.join(",")}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to unmark seasons as seen");
      }
      return await res.json();
    },
    onSuccess: (_, variables) => {
      console.log("[useUnmarkSeasonsSeen] onSuccess - invalidating queries for tvShow:", variables.tvShowTmdbId);
      // Invalidate seen episodes query
      queryClient.invalidateQueries({ queryKey: ["seen-episodes", variables.tvShowTmdbId] });
      // Also invalidate watched status for the TV show
      queryClient.invalidateQueries({ queryKey: ["is-watched", variables.tvShowTmdbId, "tv"] });
      // Refetch seen seasons check immediately
      queryClient.refetchQueries({ queryKey: ["seen-seasons", variables.tvShowTmdbId] });
      console.log("[useUnmarkSeasonsSeen] Queries invalidated and refetched");
      toast.success(`Unmarked ${variables.seasonNumbers.length} ${variables.seasonNumbers.length === 1 ? "season" : "seasons"} as seen`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to unmark seasons as seen");
    },
  });
}

// Check which seasons have all episodes seen
const checkSeenSeasons = async (tvShowTmdbId: number): Promise<number[]> => {
  const res = await fetch(`/api/episodes/seasons/check?tvShowTmdbId=${tvShowTmdbId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch seen seasons");
  }
  const data = await res.json();
  return data.seenSeasons || [];
};

// Hook to get which seasons are fully seen
export function useSeenSeasons(tvShowTmdbId: number | null) {
  return useQuery<number[]>({
    queryKey: tvShowTmdbId ? ["seen-seasons", tvShowTmdbId] : ["seen-seasons"],
    queryFn: async () => {
      console.log("[useSeenSeasons] Fetching seen seasons for tvShow:", tvShowTmdbId);
      if (!tvShowTmdbId) {
        console.log("[useSeenSeasons] No tvShowTmdbId, returning empty array");
        return [];
      }
      try {
        const result = await checkSeenSeasons(tvShowTmdbId);
        console.log("[useSeenSeasons] Fetched seen seasons:", result);
        return result;
      } catch (error) {
        console.error("[useSeenSeasons] Failed to check seen seasons:", error);
        throw error; // Let React Query handle the error properly
      }
    },
    enabled: !!tvShowTmdbId,
    staleTime: 0, // Always refetch when invalidated
    retry: 1,
  });
}
