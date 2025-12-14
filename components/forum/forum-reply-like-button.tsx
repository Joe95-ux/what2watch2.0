"use client";

import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
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
  const { data: reaction, isLoading } = useForumReplyReaction(replyId);
  const toggleReaction = useToggleForumReplyLike(replyId);

  const userReaction = reaction?.reactionType || null;
  const isUpvoted = userReaction === "upvote";
  const isDownvoted = userReaction === "downvote";
  const displayScore = reaction?.score ?? 0;

  const handleVote = async (type: "upvote" | "downvote") => {
    if (!isSignedIn) {
      toast.error("Sign in to vote on replies");
      return;
    }

    if (!toggleReaction.mutate) return;
    
    if (userReaction === type) {
      toggleReaction.mutate({ type: null });
    } else {
      toggleReaction.mutate({ type });
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-6 w-6 p-0 hover:bg-orange-500/10 hover:text-orange-500",
          isUpvoted && "text-orange-500 bg-orange-500/10"
        )}
        onClick={() => handleVote("upvote")}
        disabled={isLoading || toggleReaction.isPending}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <span className={cn(
        "text-xs font-semibold min-w-[1.5rem] text-center text-muted-foreground",
        isUpvoted && "text-orange-500",
        isDownvoted && "text-blue-500"
      )}>
        {displayScore}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-6 w-6 p-0 hover:bg-blue-500/10 hover:text-blue-500",
          isDownvoted && "text-blue-500 bg-blue-500/10"
        )}
        onClick={() => handleVote("downvote")}
        disabled={isLoading || toggleReaction.isPending}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}

