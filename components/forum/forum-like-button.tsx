"use client";

import { Button } from "@/components/ui/button";
import { ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForumPostReaction, useToggleForumPostLike } from "@/hooks/use-forum-reactions";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

interface ForumLikeButtonProps {
  postId: string;
  variant?: "post" | "reply";
  replyId?: string;
  className?: string;
}

export function ForumLikeButton({ postId, variant = "post", replyId, className }: ForumLikeButtonProps) {
  const { isSignedIn } = useUser();
  const { data: reactionData, isLoading } = useForumPostReaction(variant === "post" ? postId : null);
  const toggleLike = useToggleForumPostLike();

  const handleLike = async () => {
    if (!isSignedIn) {
      toast.error("Sign in to like posts");
      return;
    }

    try {
      await toggleLike.mutateAsync(postId);
    } catch (error) {
      toast.error("Failed to toggle like");
    }
  };

  if (variant === "reply" && replyId) {
    // For replies, we'd use useForumReplyReaction and useToggleForumReplyLike
    // This is a simplified version - you can extend it
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLike}
      disabled={isLoading || toggleLike.isPending}
      className={cn(
        "h-8 cursor-pointer",
        reactionData?.isLiked && "text-primary",
        className
      )}
    >
      <ThumbsUp className={cn("h-4 w-4 mr-1", reactionData?.isLiked && "fill-current")} />
      {reactionData?.likeCount || 0}
    </Button>
  );
}

