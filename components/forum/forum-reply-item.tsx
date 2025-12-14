"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, ChevronUp, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateReplyForm } from "./create-reply-form";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useForumReplyReaction, useToggleForumReplyLike } from "@/hooks/use-forum-reactions";

interface ForumReply {
  id: string;
  content: string;
  likes: number;
  score?: number;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  parentReplyId?: string;
  replies: ForumReply[];
  createdAt: string;
  updatedAt: string;
}

interface ForumReplyItemProps {
  reply: ForumReply;
  postId: string;
  depth?: number;
}

export function ForumReplyItem({ reply, postId, depth = 0 }: ForumReplyItemProps) {
  const { isSignedIn } = useUser();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const maxDepth = 5; // Maximum nesting depth (Reddit allows deeper nesting)

  const { data: reaction } = useForumReplyReaction(reply.id);
  const toggleReaction = useToggleForumReplyLike(reply.id);

  const userReaction = reaction?.reactionType || null;
  const isUpvoted = userReaction === "upvote";
  const isDownvoted = userReaction === "downvote";
  const displayScore = reaction?.score ?? reply.score ?? reply.likes ?? 0;

  const handleVote = async (type: "upvote" | "downvote") => {
    if (!toggleReaction.mutate) return;
    
    if (userReaction === type) {
      toggleReaction.mutate({ type: null });
    } else {
      toggleReaction.mutate({ type });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn(
      "flex gap-2",
      depth > 0 && "ml-8"
    )}>
      {/* Vote Buttons - Reddit style */}
      <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 p-0 hover:bg-orange-500/10 hover:text-orange-500",
            isUpvoted && "text-orange-500 bg-orange-500/10"
          )}
          onClick={() => handleVote("upvote")}
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
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Reply Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <Link
            href={`/users/${reply.author.username || reply.author.id}`}
            className="text-xs font-semibold hover:underline"
          >
            {reply.author.displayName}
          </Link>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
          </span>
        </div>

        <div className="text-sm mb-2 whitespace-pre-wrap">
          {reply.content}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {isSignedIn && depth < maxDepth && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="h-7 px-2 text-xs cursor-pointer"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Reply
            </Button>
          )}
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <div className="mt-3">
            <CreateReplyForm
              postId={postId}
              parentReplyId={reply.id}
              onSuccess={() => setShowReplyForm(false)}
            />
          </div>
        )}

        {/* Nested Replies - Reddit style with indentation */}
        {reply.replies && reply.replies.length > 0 && (
          <div className={cn(
            "mt-2 space-y-2",
            depth > 0 && "border-l border-border/50 pl-4 ml-2"
          )}>
            {reply.replies.map((nestedReply) => (
              <ForumReplyItem
                key={nestedReply.id}
                reply={nestedReply}
                postId={postId}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

