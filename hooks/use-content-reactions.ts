import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface ContentReactionResponse {
  isLiked: boolean;
  isDisliked: boolean;
  likeCount: number;
  dislikeCount: number;
}

// Get reaction status and counts for content
export function useContentReactions(tmdbId: number | null, mediaType: "movie" | "tv" | null) {
  return useQuery<ContentReactionResponse>({
    queryKey: ["content", tmdbId, mediaType, "reaction"],
    queryFn: async () => {
      if (!tmdbId || !mediaType) {
        return {
          isLiked: false,
          isDisliked: false,
          likeCount: 0,
          dislikeCount: 0,
        };
      }
      const response = await fetch(`/api/content/${tmdbId}/reaction?mediaType=${mediaType}`);
      if (!response.ok) {
        return {
          isLiked: false,
          isDisliked: false,
          likeCount: 0,
          dislikeCount: 0,
        };
      }
      return response.json();
    },
    enabled: !!tmdbId && !!mediaType,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Like content
export function useLikeContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tmdbId,
      mediaType,
    }: {
      tmdbId: number;
      mediaType: "movie" | "tv";
    }) => {
      const response = await fetch(`/api/content/${tmdbId}/reaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mediaType,
          reactionType: "like",
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to like content");
      }
      return response.json();
    },
    onMutate: async ({ tmdbId, mediaType }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["content", tmdbId, mediaType, "reaction"],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<ContentReactionResponse>([
        "content",
        tmdbId,
        mediaType,
        "reaction",
      ]);

      // Optimistically update
      if (previousData) {
        const wasLiked = previousData.isLiked;
        const wasDisliked = previousData.isDisliked;
        queryClient.setQueryData<ContentReactionResponse>(
          ["content", tmdbId, mediaType, "reaction"],
          {
            isLiked: !wasLiked,
            isDisliked: false,
            likeCount: wasLiked
              ? Math.max(0, previousData.likeCount - 1)
              : previousData.likeCount + 1,
            dislikeCount: wasDisliked
              ? Math.max(0, previousData.dislikeCount - 1)
              : previousData.dislikeCount,
          }
        );
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["content", variables.tmdbId, variables.mediaType, "reaction"],
          context.previousData
        );
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate to refetch
      queryClient.invalidateQueries({
        queryKey: ["content", variables.tmdbId, variables.mediaType, "reaction"],
      });
    },
  });
}

// Dislike content
export function useDislikeContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tmdbId,
      mediaType,
    }: {
      tmdbId: number;
      mediaType: "movie" | "tv";
    }) => {
      const response = await fetch(`/api/content/${tmdbId}/reaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mediaType,
          reactionType: "dislike",
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to dislike content");
      }
      return response.json();
    },
    onMutate: async ({ tmdbId, mediaType }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["content", tmdbId, mediaType, "reaction"],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<ContentReactionResponse>([
        "content",
        tmdbId,
        mediaType,
        "reaction",
      ]);

      // Optimistically update
      if (previousData) {
        const wasLiked = previousData.isLiked;
        const wasDisliked = previousData.isDisliked;
        queryClient.setQueryData<ContentReactionResponse>(
          ["content", tmdbId, mediaType, "reaction"],
          {
            isLiked: false,
            isDisliked: !wasDisliked,
            likeCount: wasLiked
              ? Math.max(0, previousData.likeCount - 1)
              : previousData.likeCount,
            dislikeCount: wasDisliked
              ? Math.max(0, previousData.dislikeCount - 1)
              : previousData.dislikeCount + 1,
          }
        );
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["content", variables.tmdbId, variables.mediaType, "reaction"],
          context.previousData
        );
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate to refetch
      queryClient.invalidateQueries({
        queryKey: ["content", variables.tmdbId, variables.mediaType, "reaction"],
      });
    },
  });
}

