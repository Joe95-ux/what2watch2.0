"use client";

import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForumPostReaction, useToggleForumPostLike } from "@/hooks/use-forum-reactions";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

interface ForumLikeButtonProps {
  postId: string;
  initialScore?: number;
  className?: string;
}

export function ForumLikeButton({ postId, initialScore = 0, className }: ForumLikeButtonProps) {
  const { isSignedIn } = useUser();
  const { data: reaction, isLoading } = useForumPostReaction(postId);
  const toggleReaction = useToggleForumPostLike(postId);

  const userReaction = reaction?.reactionType || null;
  const isUpvoted = userReaction === "upvote";
  const isDownvoted = userReaction === "downvote";
  const displayScore = reaction?.score ?? initialScore;

  const handleVote = async (type: "upvote" | "downvote") => {
    if (!isSignedIn) {
      toast.error("Sign in to vote on posts");
      return;
    }

    if (!toggleReaction.mutate) return;
    
    if (userReaction === type) {
      // Remove reaction if clicking the same button
      toggleReaction.mutate({ type: null });
    } else {
      // Set new reaction
      toggleReaction.mutate({ type });
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 p-0 hover:bg-orange-500/10 hover:text-orange-500",
          isUpvoted && "text-orange-500 bg-orange-500/10"
        )}
        onClick={() => handleVote("upvote")}
        disabled={isLoading || toggleReaction.isPending}
      >
        <ChevronUp className="h-5 w-5" />
      </Button>
      <span className={cn(
        "text-xs font-semibold min-w-[2rem] text-center",
        isUpvoted && "text-orange-500",
        isDownvoted && "text-blue-500"
      )}>
        {displayScore}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 p-0 hover:bg-blue-500/10 hover:text-blue-500",
          isDownvoted && "text-blue-500 bg-blue-500/10"
        )}
        onClick={() => handleVote("downvote")}
        disabled={isLoading || toggleReaction.isPending}
      >
        <ChevronDown className="h-5 w-5" />
      </Button>
    </div>
  );
}

