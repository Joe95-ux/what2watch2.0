import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ListCommentReaction {
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

export interface ListComment {
  id: string;
  listId: string;
  userId: string;
  content: string;
  parentCommentId: string | null;
  likes: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  reactions?: ListCommentReaction[];
  replies?: ListComment[];
}

interface CreateCommentParams {
  listId: string;
  content: string;
  parentCommentId?: string | null;
}

interface UpdateCommentParams {
  listId: string;
  commentId: string;
  content: string;
}

// Fetch comments for a list
const fetchComments = async (listId: string, filter: string = "newest"): Promise<ListComment[]> => {
  const res = await fetch(`/api/lists/${listId}/comments?filter=${filter}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to fetch comments" }));
    throw new Error(error.error || `Failed to fetch comments: ${res.status}`);
  }
  const data = await res.json();
  return data.comments || [];
};

// Create a comment
const createComment = async ({ listId, content, parentCommentId }: CreateCommentParams): Promise<ListComment> => {
  const res = await fetch(`/api/lists/${listId}/comments`, {
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
const updateComment = async ({ listId, commentId, content }: UpdateCommentParams): Promise<ListComment> => {
  const res = await fetch(`/api/lists/${listId}/comments/${commentId}`, {
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
const deleteComment = async (listId: string, commentId: string): Promise<void> => {
  const res = await fetch(`/api/lists/${listId}/comments/${commentId}`, {
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

export function useListComments(listId: string, filter: string = "newest") {
  return useQuery<ListComment[]>({
    queryKey: ["list-comments", listId, filter],
    queryFn: () => fetchComments(listId, filter),
    enabled: !!listId,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useCreateListComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createComment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["list-comments", variables.listId] });
      queryClient.invalidateQueries({ queryKey: ["list", variables.listId] });
    },
  });
}

export function useUpdateListComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateComment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["list-comments", variables.listId] });
    },
  });
}

export function useDeleteListComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, commentId }: { listId: string; commentId: string }) =>
      deleteComment(listId, commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["list-comments", variables.listId] });
      queryClient.invalidateQueries({ queryKey: ["list", variables.listId] });
    },
  });
}

// Add reaction to a comment
const addReaction = async ({
  listId,
  commentId,
  reactionType,
}: {
  listId: string;
  commentId: string;
  reactionType: string;
}): Promise<ListCommentReaction> => {
  const res = await fetch(`/api/lists/${listId}/comments/${commentId}/reactions`, {
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
  listId,
  commentId,
  reactionType,
}: {
  listId: string;
  commentId: string;
  reactionType: string;
}): Promise<void> => {
  const res = await fetch(
    `/api/lists/${listId}/comments/${commentId}/reactions?reactionType=${encodeURIComponent(reactionType)}`,
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

export function useAddListCommentReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addReaction,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["list-comments", variables.listId] });

      const commentQueries = queryClient.getQueriesData<ListComment[]>({
        queryKey: ["list-comments", variables.listId],
      });
      const previousComments = commentQueries.map(([queryKey, data]) => [queryKey, data] as const);

      const currentUserQueries = queryClient.getQueriesData<{ id: string; username: string; displayName: string | null; avatarUrl: string | null } | null>({
        queryKey: ["current-user"],
        exact: false,
      });
      const currentUser = currentUserQueries[0]?.[1] || null;

      if (commentQueries.length > 0) {
        const updateCommentWithReaction = (comment: ListComment): ListComment => {
          if (comment.id === variables.commentId) {
            const optimisticReaction: ListCommentReaction = {
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
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: comment.replies.map(updateCommentWithReaction),
            };
          }
          return comment;
        };

        commentQueries.forEach(([queryKey, comments]) => {
          if (!comments) return;
          const optimisticComments = comments.map(updateCommentWithReaction);
          queryClient.setQueryData<ListComment[]>(queryKey, optimisticComments);
        });
      }

      return { previousComments };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        context.previousComments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["list-comments", variables.listId] });
    },
  });
}

export function useRemoveListCommentReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeReaction,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["list-comments", variables.listId] });

      const commentQueries = queryClient.getQueriesData<ListComment[]>({
        queryKey: ["list-comments", variables.listId],
      });
      const previousComments = commentQueries.map(([queryKey, data]) => [queryKey, data] as const);

      if (commentQueries.length > 0) {
        const updateCommentWithRemovedReaction = (comment: ListComment): ListComment => {
          if (comment.id === variables.commentId) {
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
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: comment.replies.map(updateCommentWithRemovedReaction),
            };
          }
          return comment;
        };

        commentQueries.forEach(([queryKey, comments]) => {
          if (!comments) return;
          const optimisticComments = comments.map(updateCommentWithRemovedReaction);
          queryClient.setQueryData<ListComment[]>(queryKey, optimisticComments);
        });
      }

      return { previousComments };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        context.previousComments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["list-comments", variables.listId] });
    },
  });
}


