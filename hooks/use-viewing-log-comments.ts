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
    onSuccess: (_, variables) => {
      // Invalidate comments for this log
      queryClient.invalidateQueries({ queryKey: ["viewing-log-comments", variables.logId] });
    },
  });
}

export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeReaction,
    onSuccess: (_, variables) => {
      // Invalidate comments for this log
      queryClient.invalidateQueries({ queryKey: ["viewing-log-comments", variables.logId] });
    },
  });
}

