import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUser, useClerk } from "@clerk/nextjs";

interface SubscriptionResponse {
  subscribed: boolean;
}

// Check if user is subscribed to a post
export function usePostSubscription(postId: string | null) {
  const { isSignedIn } = useUser();
  
  return useQuery<SubscriptionResponse>({
    queryKey: ["forum-post", postId, "subscription"],
    queryFn: async () => {
      if (!postId || !isSignedIn) {
        return { subscribed: false };
      }
      const response = await fetch(`/api/forum/posts/${postId}/subscribe`);
      if (!response.ok) {
        return { subscribed: false };
      }
      return response.json();
    },
    enabled: !!postId && isSignedIn,
    staleTime: 30 * 1000,
  });
}

// Subscribe to a post
export function useSubscribeToPost(postId: string) {
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
          toast.error("Please sign in to subscribe to posts");
        }
        throw new Error("Not signed in");
      }

      const response = await fetch(`/api/forum/posts/${postId}/subscribe`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to subscribe to post");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["forum-post", postId, "subscription"],
      });
      toast.success("Subscribed to post");
    },
    onError: (error: Error) => {
      if (!error.message.includes("Not signed in")) {
        toast.error(error.message || "Failed to subscribe to post");
      }
    },
  });
}

// Unsubscribe from a post
export function useUnsubscribeFromPost(postId: string) {
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
          toast.error("Please sign in to unsubscribe from posts");
        }
        throw new Error("Not signed in");
      }

      const response = await fetch(`/api/forum/posts/${postId}/subscribe`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unsubscribe from post");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["forum-post", postId, "subscription"],
      });
      toast.success("Unsubscribed from post");
    },
    onError: (error: Error) => {
      if (!error.message.includes("Not signed in")) {
        toast.error(error.message || "Failed to unsubscribe from post");
      }
    },
  });
}

