import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUser, useClerk } from "@clerk/nextjs";

interface BookmarkResponse {
  bookmarked: boolean;
}

// Check if user has bookmarked a post
export function usePostBookmark(postId: string | null) {
  const { isSignedIn } = useUser();
  
  return useQuery<BookmarkResponse>({
    queryKey: ["forum-post", postId, "bookmark"],
    queryFn: async () => {
      if (!postId || !isSignedIn) {
        return { bookmarked: false };
      }
      const response = await fetch(`/api/forum/posts/${postId}/bookmark`);
      if (!response.ok) {
        return { bookmarked: false };
      }
      return response.json();
    },
    enabled: !!postId && isSignedIn,
    staleTime: 30 * 1000,
  });
}

// Bookmark a post
export function useBookmarkPost(postId: string) {
  const queryClient = useQueryClient();
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();

  return useMutation({
    mutationFn: async () => {
      if (!isSignedIn) {
        if (openSignIn) {
          openSignIn({
            afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
          });
        } else {
          toast.error("Please sign in to save posts");
        }
        throw new Error("Not signed in");
      }

      const response = await fetch(`/api/forum/posts/${postId}/bookmark`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save post");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["forum-post", postId, "bookmark"],
      });
      queryClient.invalidateQueries({
        queryKey: ["forum-bookmarks"],
      });
      toast.success("Post saved");
    },
    onError: (error: Error) => {
      if (!error.message.includes("Not signed in")) {
        toast.error(error.message || "Failed to save post");
      }
    },
  });
}

// Unbookmark a post
export function useUnbookmarkPost(postId: string) {
  const queryClient = useQueryClient();
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();

  return useMutation({
    mutationFn: async () => {
      if (!isSignedIn) {
        if (openSignIn) {
          openSignIn({
            afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
          });
        } else {
          toast.error("Please sign in to remove posts from saved");
        }
        throw new Error("Not signed in");
      }

      const response = await fetch(`/api/forum/posts/${postId}/bookmark`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove post from saved posts");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["forum-post", postId, "bookmark"],
      });
      queryClient.invalidateQueries({
        queryKey: ["forum-bookmarks"],
      });
      toast.success("Post removed from saved posts");
    },
    onError: (error: Error) => {
      if (!error.message.includes("Not signed in")) {
        toast.error(error.message || "Failed to remove post from saved posts");
      }
    },
  });
}

