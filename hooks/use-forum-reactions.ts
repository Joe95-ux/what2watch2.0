import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface ForumReactionResponse {
  isLiked: boolean;
  likeCount: number;
}

// Get reaction status for a forum post
export function useForumPostReaction(postId: string | null) {
  return useQuery<ForumReactionResponse>({
    queryKey: ["forum-post", postId, "reaction"],
    queryFn: async () => {
      if (!postId) {
        return { isLiked: false, likeCount: 0 };
      }
      const response = await fetch(`/api/forum/posts/${postId}/reactions`);
      if (!response.ok) {
        return { isLiked: false, likeCount: 0 };
      }
      return response.json();
    },
    enabled: !!postId,
    staleTime: 30 * 1000,
  });
}

// Toggle like on a forum post
export function useToggleForumPostLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetch(`/api/forum/posts/${postId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reactionType: "like" }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to toggle like");
      }
      return response.json();
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({
        queryKey: ["forum-post", postId, "reaction"],
      });

      const previousData = queryClient.getQueryData<ForumReactionResponse>([
        "forum-post",
        postId,
        "reaction",
      ]);

      if (previousData) {
        queryClient.setQueryData<ForumReactionResponse>(
          ["forum-post", postId, "reaction"],
          {
            isLiked: !previousData.isLiked,
            likeCount: previousData.isLiked
              ? Math.max(0, previousData.likeCount - 1)
              : previousData.likeCount + 1,
          }
        );
      }

      return { previousData };
    },
    onError: (err, postId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["forum-post", postId, "reaction"],
          context.previousData
        );
      }
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({
        queryKey: ["forum-post", postId, "reaction"],
      });
      queryClient.invalidateQueries({
        queryKey: ["forum-post", postId],
      });
      queryClient.invalidateQueries({
        queryKey: ["forum-posts"],
      });
    },
  });
}

// Get reaction status for a forum reply
export function useForumReplyReaction(replyId: string | null) {
  return useQuery<ForumReactionResponse>({
    queryKey: ["forum-reply", replyId, "reaction"],
    queryFn: async () => {
      if (!replyId) {
        return { isLiked: false, likeCount: 0 };
      }
      const response = await fetch(`/api/forum/replies/${replyId}/reactions`);
      if (!response.ok) {
        return { isLiked: false, likeCount: 0 };
      }
      return response.json();
    },
    enabled: !!replyId,
    staleTime: 30 * 1000,
  });
}

// Toggle like on a forum reply
export function useToggleForumReplyLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (replyId: string) => {
      const response = await fetch(`/api/forum/replies/${replyId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reactionType: "like" }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to toggle like");
      }
      return response.json();
    },
    onMutate: async (replyId) => {
      await queryClient.cancelQueries({
        queryKey: ["forum-reply", replyId, "reaction"],
      });

      const previousData = queryClient.getQueryData<ForumReactionResponse>([
        "forum-reply",
        replyId,
        "reaction",
      ]);

      if (previousData) {
        queryClient.setQueryData<ForumReactionResponse>(
          ["forum-reply", replyId, "reaction"],
          {
            isLiked: !previousData.isLiked,
            likeCount: previousData.isLiked
              ? Math.max(0, previousData.likeCount - 1)
              : previousData.likeCount + 1,
          }
        );
      }

      return { previousData };
    },
    onError: (err, replyId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["forum-reply", replyId, "reaction"],
          context.previousData
        );
      }
    },
    onSuccess: (_, replyId) => {
      queryClient.invalidateQueries({
        queryKey: ["forum-reply", replyId, "reaction"],
      });
      // Invalidate the post to refresh reply counts
      queryClient.invalidateQueries({
        queryKey: ["forum-post"],
      });
    },
  });
}

