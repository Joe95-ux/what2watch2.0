import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUser, useClerk } from "@clerk/nextjs";

interface SubscriptionResponse {
  subscribed: boolean;
}

// Check if user is subscribed to a reply
export function useReplySubscription(replyId: string | null) {
  const { isSignedIn } = useUser();
  
  return useQuery<SubscriptionResponse>({
    queryKey: ["forum-reply", replyId, "subscription"],
    queryFn: async () => {
      if (!replyId || !isSignedIn) {
        return { subscribed: false };
      }
      const response = await fetch(`/api/forum/replies/${replyId}/subscribe`);
      if (!response.ok) {
        return { subscribed: false };
      }
      return response.json();
    },
    enabled: !!replyId && isSignedIn,
    staleTime: 30 * 1000,
  });
}

// Subscribe to a reply
export function useSubscribeToReply(replyId: string) {
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
          toast.error("Please sign in to follow comments");
        }
        throw new Error("Not signed in");
      }

      const response = await fetch(`/api/forum/replies/${replyId}/subscribe`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to follow comment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["forum-reply", replyId, "subscription"],
      });
      toast.success("Following comment");
    },
    onError: (error: Error) => {
      if (!error.message.includes("Not signed in")) {
        toast.error(error.message || "Failed to follow comment");
      }
    },
  });
}

// Unsubscribe from a reply
export function useUnsubscribeFromReply(replyId: string) {
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
          toast.error("Please sign in to unfollow comments");
        }
        throw new Error("Not signed in");
      }

      const response = await fetch(`/api/forum/replies/${replyId}/subscribe`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unfollow comment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["forum-reply", replyId, "subscription"],
      });
      toast.success("Unfollowed comment");
    },
    onError: (error: Error) => {
      if (!error.message.includes("Not signed in")) {
        toast.error(error.message || "Failed to unfollow comment");
      }
    },
  });
}

