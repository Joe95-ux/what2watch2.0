import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Check if episodes are seen
const checkSeenEpisodes = async (tvShowTmdbId: number): Promise<number[]> => {
  const res = await fetch(`/api/episodes/check?tvShowTmdbId=${tvShowTmdbId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.seenEpisodes || [];
};

// Hook to get seen episodes for a TV show
export function useSeenEpisodes(tvShowTmdbId: number | null) {
  return useQuery<number[]>({
    queryKey: ["seen-episodes", tvShowTmdbId],
    queryFn: () => checkSeenEpisodes(tvShowTmdbId!),
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
      isSeen: boolean;
    }) => {
      if (params.isSeen) {
        // Mark as seen
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
      } else {
        // Mark as not seen
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
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate seen episodes query
      queryClient.invalidateQueries({ queryKey: ["seen-episodes", variables.tvShowTmdbId] });
      // Also invalidate watched status for the TV show
      queryClient.invalidateQueries({ queryKey: ["is-watched", variables.tvShowTmdbId, "tv"] });
      // Invalidate seen seasons check
      queryClient.invalidateQueries({ queryKey: ["seen-seasons", variables.tvShowTmdbId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update episode status");
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
    },
    onSuccess: (_, variables) => {
      // Invalidate seen episodes query
      queryClient.invalidateQueries({ queryKey: ["seen-episodes", variables.tvShowTmdbId] });
      // Also invalidate watched status for the TV show
      queryClient.invalidateQueries({ queryKey: ["is-watched", variables.tvShowTmdbId, "tv"] });
      // Invalidate seen seasons check
      queryClient.invalidateQueries({ queryKey: ["seen-seasons", variables.tvShowTmdbId] });
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
    },
    onSuccess: (_, variables) => {
      // Invalidate seen episodes query
      queryClient.invalidateQueries({ queryKey: ["seen-episodes", variables.tvShowTmdbId] });
      // Also invalidate watched status for the TV show
      queryClient.invalidateQueries({ queryKey: ["is-watched", variables.tvShowTmdbId, "tv"] });
      // Invalidate seen seasons check
      queryClient.invalidateQueries({ queryKey: ["seen-seasons", variables.tvShowTmdbId] });
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
  if (!res.ok) return [];
  const data = await res.json();
  return data.seenSeasons || [];
};

// Hook to get which seasons are fully seen
export function useSeenSeasons(tvShowTmdbId: number | null) {
  return useQuery<number[]>({
    queryKey: ["seen-seasons", tvShowTmdbId],
    queryFn: async () => {
      if (!tvShowTmdbId) return [];
      try {
        return await checkSeenSeasons(tvShowTmdbId);
      } catch (error) {
        console.error("Failed to check seen seasons:", error);
        return [];
      }
    },
    enabled: !!tvShowTmdbId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}
