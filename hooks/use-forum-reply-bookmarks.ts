import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUser, useClerk } from "@clerk/nextjs";

interface BookmarkResponse {
  bookmarked: boolean;
}

// Check if user has bookmarked a reply
export function useReplyBookmark(replyId: string | null) {
  const { isSignedIn } = useUser();
  
  return useQuery<BookmarkResponse>({
    queryKey: ["forum-reply", replyId, "bookmark"],
    queryFn: async () => {
      if (!replyId || !isSignedIn) {
        return { bookmarked: false };
      }
      const response = await fetch(`/api/forum/replies/${replyId}/bookmark`);
      if (!response.ok) {
        return { bookmarked: false };
      }
      return response.json();
    },
    enabled: !!replyId && isSignedIn,
    staleTime: 30 * 1000,
  });
}

// Bookmark a reply
export function useBookmarkReply(replyId: string) {
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
          toast.error("Please sign in to save comments");
        }
        throw new Error("Not signed in");
      }

      const response = await fetch(`/api/forum/replies/${replyId}/bookmark`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save comment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["forum-reply", replyId, "bookmark"],
      });
      queryClient.invalidateQueries({
        queryKey: ["forum-reply-bookmarks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["forum-reply-bookmarks-count"],
      });
      toast.success("Comment saved");
    },
    onError: (error: Error) => {
      if (!error.message.includes("Not signed in")) {
        toast.error(error.message || "Failed to save comment");
      }
    },
  });
}

// Unbookmark a reply
export function useUnbookmarkReply(replyId: string) {
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
          toast.error("Please sign in to unsave comments");
        }
        throw new Error("Not signed in");
      }

      const response = await fetch(`/api/forum/replies/${replyId}/bookmark`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unsave comment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["forum-reply", replyId, "bookmark"],
      });
      queryClient.invalidateQueries({
        queryKey: ["forum-reply-bookmarks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["forum-reply-bookmarks-count"],
      });
      toast.success("Comment unsaved");
    },
    onError: (error: Error) => {
      if (!error.message.includes("Not signed in")) {
        toast.error(error.message || "Failed to unsave comment");
      }
    },
  });
}

