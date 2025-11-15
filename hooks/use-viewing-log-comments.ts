import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  createdAt: string;
  updatedAt: string;
}

interface CreateCommentParams {
  logId: string;
  content: string;
  parentCommentId?: string | null;
}

// Fetch comments for a viewing log
const fetchComments = async (logId: string, filter: string = "newest"): Promise<ViewingLogComment[]> => {
  const res = await fetch(`/api/viewing-logs/${logId}/comments?filter=${filter}`);
  if (!res.ok) throw new Error("Failed to fetch comments");
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
    const error = await res.json();
    throw new Error(error.error || "Failed to create comment");
  }
  const data = await res.json();
  return data.comment;
};

// Delete a comment
const deleteComment = async (logId: string, commentId: string): Promise<void> => {
  const res = await fetch(`/api/viewing-logs/${logId}/comments/${commentId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete comment");
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

