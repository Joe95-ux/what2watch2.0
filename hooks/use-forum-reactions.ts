import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface ForumReactionResponse {
  reactionType: "upvote" | "downvote" | null;
  score: number;
}

// Get reaction status for a forum post
export function useForumPostReaction(postId: string | null) {
  return useQuery<ForumReactionResponse>({
    queryKey: ["forum-post", postId, "reaction"],
    queryFn: async () => {
      if (!postId) {
        return { reactionType: null, score: 0 };
      }
      const response = await fetch(`/api/forum/posts/${postId}/reactions`);
      if (!response.ok) {
        return { reactionType: null, score: 0 };
      }
      return response.json();
    },
    enabled: !!postId,
    staleTime: 30 * 1000,
  });
}

// Toggle reaction on a forum post
export function useToggleForumPostLike(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type }: { type: "upvote" | "downvote" | null }) => {
      const response = await fetch(`/api/forum/posts/${postId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reactionType: type }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to toggle reaction");
      }
      return response.json();
    },
    onMutate: async ({ type }) => {
      await queryClient.cancelQueries({
        queryKey: ["forum-post", postId, "reaction"],
      });

      const previousData = queryClient.getQueryData<ForumReactionResponse>([
        "forum-post",
        postId,
        "reaction",
      ]);

      if (previousData) {
        const currentType = previousData.reactionType;
        let newType: "upvote" | "downvote" | null = type;
        let scoreDelta = 0;

        if (currentType === type) {
          // Remove reaction
          newType = null;
          scoreDelta = type === "upvote" ? -1 : 1;
        } else if (currentType === null) {
          // Add new reaction
          scoreDelta = type === "upvote" ? 1 : -1;
        } else {
          // Switch reaction
          scoreDelta = type === "upvote" ? 2 : -2;
        }

        queryClient.setQueryData<ForumReactionResponse>(
          ["forum-post", postId, "reaction"],
          {
            reactionType: newType,
            score: previousData.score + scoreDelta,
          }
        );
      }

      return { previousData };
    },
    onError: (err, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["forum-post", postId, "reaction"],
          context.previousData
        );
      }
    },
    onSuccess: () => {
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
        return { reactionType: null, score: 0 };
      }
      const response = await fetch(`/api/forum/replies/${replyId}/reactions`);
      if (!response.ok) {
        return { reactionType: null, score: 0 };
      }
      return response.json();
    },
    enabled: !!replyId,
    staleTime: 30 * 1000,
  });
}

// Toggle reaction on a forum reply
export function useToggleForumReplyLike(replyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type }: { type: "upvote" | "downvote" | null }) => {
      const response = await fetch(`/api/forum/replies/${replyId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reactionType: type }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to toggle reaction");
      }
      return response.json();
    },
    onMutate: async ({ type }) => {
      await queryClient.cancelQueries({
        queryKey: ["forum-reply", replyId, "reaction"],
      });

      const previousData = queryClient.getQueryData<ForumReactionResponse>([
        "forum-reply",
        replyId,
        "reaction",
      ]);

      if (previousData) {
        const currentType = previousData.reactionType;
        let newType: "upvote" | "downvote" | null = type;
        let scoreDelta = 0;

        if (currentType === type) {
          // Remove reaction
          newType = null;
          scoreDelta = type === "upvote" ? -1 : 1;
        } else if (currentType === null) {
          // Add new reaction
          scoreDelta = type === "upvote" ? 1 : -1;
        } else {
          // Switch reaction
          scoreDelta = type === "upvote" ? 2 : -2;
        }

        queryClient.setQueryData<ForumReactionResponse>(
          ["forum-reply", replyId, "reaction"],
          {
            reactionType: newType,
            score: previousData.score + scoreDelta,
          }
        );
      }

      return { previousData };
    },
    onError: (err, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["forum-reply", replyId, "reaction"],
          context.previousData
        );
      }
    },
    onSuccess: () => {
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

