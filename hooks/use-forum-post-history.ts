import { useQuery } from "@tanstack/react-query";

interface PostRevision {
  id: string;
  postId: string;
  title: string;
  content: string;
  tags: string[];
  categoryId: string | null;
  metadata: Record<string, any> | null;
  editedBy: string;
  editedAt: string;
  editor?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface PostHistoryResponse {
  revisions: PostRevision[];
}

/**
 * Hook to fetch post revision history
 */
export function usePostHistory(postId: string | null, limit: number = 50) {
  return useQuery<PostHistoryResponse>({
    queryKey: ["forum-post-history", postId, limit],
    queryFn: async () => {
      if (!postId) throw new Error("Post ID required");
      const response = await fetch(`/api/forum/posts/${postId}/history?limit=${limit}`);
      if (!response.ok) {
        throw new Error("Failed to fetch post history");
      }
      return response.json();
    },
    enabled: !!postId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

