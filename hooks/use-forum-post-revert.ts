import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface RevertPostParams {
  postId: string;
  revisionId: string;
}

/**
 * Hook to revert a post to a specific revision
 */
export function useRevertPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, revisionId }: RevertPostParams) => {
      const response = await fetch(`/api/forum/posts/${postId}/revert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ revisionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to revert post");
      }

      return response.json();
    },
    onSuccess: async (_, variables) => {
      // Invalidate and refetch post data
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["forum-post", variables.postId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["forum-post-history", variables.postId],
        }),
        // Also invalidate post list queries to refresh post cards
        queryClient.invalidateQueries({
          queryKey: ["forum-posts"],
        }),
      ]);
      toast.success("Post reverted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to revert post");
    },
  });
}

