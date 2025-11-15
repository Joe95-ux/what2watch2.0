import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface CommentReaction {
  id: string;
  commentId: string;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  reactionType: string; // "like" or emoji
  createdAt: string;
}

export interface ViewingLogComment {
  id: string;
  viewingLogId: string;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  content: string;
  parentCommentId: string | null;
  replies: ViewingLogComment[];
  likes: number;
  reactions?: CommentReaction[];
  createdAt: string;
  updatedAt: string;
}

interface CreateCommentParams {
  logId: string;
  content: string;
  parentCommentId?: string | null;
}

interface UpdateCommentParams {
  logId: string;
  commentId: string;
  content: string;
}

// Fetch comments for a viewing log
const fetchComments = async (logId: string, filter: string = "newest"): Promise<ViewingLogComment[]> => {
  const res = await fetch(`/api/viewing-logs/${logId}/comments?filter=${filter}`);
  if (!res.ok) {
    let errorMessage = "Failed to fetch comments";
    try {
      const error = await res.json();
      errorMessage = error.error || errorMessage;
    } catch {
      errorMessage = res.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  const data = await res.json();
  return data.comments || [];
};

// Create a comment
const createComment = async ({ logId, content, parentCommentId }: CreateCommentParams): Promise<ViewingLogComment> => {
  const res = await fetch(`/api/viewing-logs/${logId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, parentCommentId: parentCommentId || null }),
  });
  if (!res.ok) {
    let errorMessage = "Failed to create comment";
    try {
      const error = await res.json();
      errorMessage = error.error || errorMessage;
    } catch {
      // If response is not JSON, use status text
      errorMessage = res.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  const data = await res.json();
  if (!data.comment) {
    throw new Error("Invalid response from server");
  }
  return data.comment;
};

// Update a comment
const updateComment = async ({ logId, commentId, content }: UpdateCommentParams): Promise<ViewingLogComment> => {
  const res = await fetch(`/api/viewing-logs/${logId}/comments/${commentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    let errorMessage = "Failed to update comment";
    try {
      const error = await res.json();
      errorMessage = error.error || errorMessage;
    } catch {
      errorMessage = res.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  const data = await res.json();
  if (!data.comment) {
    throw new Error("Invalid response from server");
  }
  return data.comment;
};

// Delete a comment
const deleteComment = async (logId: string, commentId: string): Promise<void> => {
  const res = await fetch(`/api/viewing-logs/${logId}/comments/${commentId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    let errorMessage = "Failed to delete comment";
    try {
      const error = await res.json();
      errorMessage = error.error || errorMessage;
    } catch {
      errorMessage = res.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
};

export function useViewingLogComments(logId: string, filter: string = "newest") {
  return useQuery({
    queryKey: ["viewing-log-comments", logId, filter],
    queryFn: () => fetchComments(logId, filter),
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createComment,
    onSuccess: (_, variables) => {
      // Invalidate comments for this log
      queryClient.invalidateQueries({ queryKey: ["viewing-log-comments", variables.logId] });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateComment,
    onSuccess: (_, variables) => {
      // Invalidate comments for this log
      queryClient.invalidateQueries({ queryKey: ["viewing-log-comments", variables.logId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ logId, commentId }: { logId: string; commentId: string }) =>
      deleteComment(logId, commentId),
    onSuccess: (_, variables) => {
      // Invalidate comments for this log
      queryClient.invalidateQueries({ queryKey: ["viewing-log-comments", variables.logId] });
    },
  });
}

// Add reaction to a comment
const addReaction = async ({
  logId,
  commentId,
  reactionType,
}: {
  logId: string;
  commentId: string;
  reactionType: string;
}): Promise<CommentReaction> => {
  const res = await fetch(`/api/viewing-logs/${logId}/comments/${commentId}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reactionType }),
  });
  if (!res.ok) {
    let errorMessage = "Failed to add reaction";
    try {
      const error = await res.json();
      errorMessage = error.error || errorMessage;
    } catch {
      errorMessage = res.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  const data = await res.json();
  if (!data.reaction) {
    throw new Error("Invalid response from server");
  }
  return data.reaction;
};

// Remove reaction from a comment
const removeReaction = async ({
  logId,
  commentId,
  reactionType,
}: {
  logId: string;
  commentId: string;
  reactionType: string;
}): Promise<void> => {
  const res = await fetch(
    `/api/viewing-logs/${logId}/comments/${commentId}/reactions?reactionType=${encodeURIComponent(reactionType)}`,
    {
      method: "DELETE",
    }
  );
  if (!res.ok) {
    let errorMessage = "Failed to remove reaction";
    try {
      const error = await res.json();
      errorMessage = error.error || errorMessage;
    } catch {
      errorMessage = res.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
};

export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addReaction,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["viewing-log-comments", variables.logId] });

      // Snapshot the previous value for rollback
      const previousComments = queryClient.getQueryData<ViewingLogComment[]>([
        "viewing-log-comments",
        variables.logId,
      ]);

      // Get current user from cache if available (try to find any current-user query)
      const currentUserQueries = queryClient.getQueriesData<{ id: string; username: string; displayName: string | null; avatarUrl: string | null } | null>({
        queryKey: ["current-user"],
        exact: false,
      });
      const currentUser = currentUserQueries[0]?.[1] || null;

      // Optimistically update the cache
      if (previousComments) {
        const updateCommentWithReaction = (comment: ViewingLogComment): ViewingLogComment => {
          if (comment.id === variables.commentId) {
            // Create optimistic reaction with current user info if available
            const optimisticReaction: CommentReaction = {
              id: `temp-${Date.now()}`,
              commentId: comment.id,
              userId: currentUser?.id || "",
              user: currentUser
                ? {
                    id: currentUser.id,
                    username: currentUser.username || "",
                    displayName: currentUser.displayName,
                    avatarUrl: currentUser.avatarUrl,
                  }
                : {
                    id: "",
                    username: "",
                    displayName: null,
                    avatarUrl: null,
                  },
              reactionType: variables.reactionType,
              createdAt: new Date().toISOString(),
            };

            return {
              ...comment,
              reactions: [...(comment.reactions || []), optimisticReaction],
              likes: variables.reactionType === "like" ? comment.likes + 1 : comment.likes,
            };
          }
          // Recursively update replies
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: comment.replies.map(updateCommentWithReaction),
            };
          }
          return comment;
        };

        const optimisticComments = previousComments.map(updateCommentWithReaction);

        // Update all filter variants
        queryClient.setQueryData<ViewingLogComment[]>(["viewing-log-comments", variables.logId, "newest"], optimisticComments);
        queryClient.setQueryData<ViewingLogComment[]>(["viewing-log-comments", variables.logId, "oldest"], optimisticComments);
        queryClient.setQueryData<ViewingLogComment[]>(["viewing-log-comments", variables.logId, "most-liked"], optimisticComments);
      }

      // Return context with previous comments for rollback
      return { previousComments };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData<ViewingLogComment[]>(["viewing-log-comments", variables.logId], context.previousComments);
        queryClient.setQueryData<ViewingLogComment[]>(["viewing-log-comments", variables.logId, "newest"], context.previousComments);
        queryClient.setQueryData<ViewingLogComment[]>(["viewing-log-comments", variables.logId, "oldest"], context.previousComments);
        queryClient.setQueryData<ViewingLogComment[]>(["viewing-log-comments", variables.logId, "most-liked"], context.previousComments);
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate to get fresh data with server response (replaces optimistic update)
      queryClient.invalidateQueries({ queryKey: ["viewing-log-comments", variables.logId] });
    },
  });
}

export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeReaction,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["viewing-log-comments", variables.logId] });

      // Snapshot the previous value for rollback
      const previousComments = queryClient.getQueryData<ViewingLogComment[]>([
        "viewing-log-comments",
        variables.logId,
      ]);

      // Optimistically update the cache
      if (previousComments) {
        const updateCommentWithRemovedReaction = (comment: ViewingLogComment): ViewingLogComment => {
          if (comment.id === variables.commentId) {
            // Remove the first matching reaction of this type (user's own reaction)
            // The server will ensure we remove the correct one
            const reactions = comment.reactions || [];
            const reactionIndex = reactions.findIndex(
              (r) => r.reactionType === variables.reactionType
            );
            
            const updatedReactions =
              reactionIndex >= 0
                ? [...reactions.slice(0, reactionIndex), ...reactions.slice(reactionIndex + 1)]
                : reactions;

            return {
              ...comment,
              reactions: updatedReactions,
              likes: variables.reactionType === "like" ? Math.max(0, comment.likes - 1) : comment.likes,
            };
          }
          // Recursively update replies
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: comment.replies.map(updateCommentWithRemovedReaction),
            };
          }
          return comment;
        };

        const optimisticComments = previousComments.map(updateCommentWithRemovedReaction);

        // Update all filter variants
        queryClient.setQueryData<ViewingLogComment[]>(["viewing-log-comments", variables.logId, "newest"], optimisticComments);
        queryClient.setQueryData<ViewingLogComment[]>(["viewing-log-comments", variables.logId, "oldest"], optimisticComments);
        queryClient.setQueryData<ViewingLogComment[]>(["viewing-log-comments", variables.logId, "most-liked"], optimisticComments);
      }

      // Return context with previous comments for rollback
      return { previousComments };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData<ViewingLogComment[]>(["viewing-log-comments", variables.logId], context.previousComments);
        queryClient.setQueryData<ViewingLogComment[]>(["viewing-log-comments", variables.logId, "newest"], context.previousComments);
        queryClient.setQueryData<ViewingLogComment[]>(["viewing-log-comments", variables.logId, "oldest"], context.previousComments);
        queryClient.setQueryData<ViewingLogComment[]>(["viewing-log-comments", variables.logId, "most-liked"], context.previousComments);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate to get fresh data with server response (replaces optimistic update)
      queryClient.invalidateQueries({ queryKey: ["viewing-log-comments", variables.logId] });
    },
  });
}

