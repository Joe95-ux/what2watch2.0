"use client";

import { Button } from "@/components/ui/button";
import { ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForumReplyReaction, useToggleForumReplyLike } from "@/hooks/use-forum-reactions";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

interface ForumReplyLikeButtonProps {
  replyId: string;
  className?: string;
}

export function ForumReplyLikeButton({ replyId, className }: ForumReplyLikeButtonProps) {
  const { isSignedIn } = useUser();
  const { data: reactionData, isLoading } = useForumReplyReaction(replyId);
  const toggleLike = useToggleForumReplyLike();

  const handleLike = async () => {
    if (!isSignedIn) {
      toast.error("Sign in to like replies");
      return;
    }

    try {
      await toggleLike.mutateAsync(replyId);
    } catch (error) {
      toast.error("Failed to toggle like");
    }
  };

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

