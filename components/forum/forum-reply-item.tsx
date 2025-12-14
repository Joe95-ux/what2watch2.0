"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, ArrowBigUp, ArrowBigDown, MoreVertical, Flag, Edit, Trash2, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateReplyForm } from "./create-reply-form";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useForumReplyReaction, useToggleForumReplyLike } from "@/hooks/use-forum-reactions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ShareDropdown } from "@/components/ui/share-dropdown";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";

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
  const { data: currentUser } = useCurrentUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const maxDepth = 5;

  const isAuthor = currentUser?.id === reply.author.id;

  const { data: reaction } = useForumReplyReaction(reply.id);
  const toggleReaction = useToggleForumReplyLike(reply.id);

  const userReaction = reaction?.reactionType || null;
  const isUpvoted = userReaction === "upvote";
  const isDownvoted = userReaction === "downvote";
  const displayScore = reaction?.score ?? reply.score ?? reply.likes ?? 0;

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleReport = async () => {
    if (!isSignedIn) {
      toast.error("Sign in to report replies");
      return;
    }
    
    const reason = prompt("Please provide a reason for reporting this reply:");
    if (!reason || reason.trim().length === 0) {
      return;
    }

    try {
      const response = await fetch(`/api/forum/replies/${reply.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to report reply");
      }

      toast.success("Reply reported successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to report reply");
    }
  };

  const deleteReply = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/forum/replies/${reply.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete reply");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
      toast.success("Reply deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete reply");
    },
  });

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this reply? This action cannot be undone.")) {
      return;
    }
    deleteReply.mutate();
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    toast.info("Edit functionality coming soon");
  };

  const replyUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/forum/${postId}#reply-${reply.id}` 
    : `/forum/${postId}#reply-${reply.id}`;

  const hasReplies = reply.replies && reply.replies.length > 0;

  if (isCollapsed) {
    return (
      <div className={cn("flex gap-2", depth > 0 && "ml-8")}>
        {/* Connection line */}
        {depth > 0 && (
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-0.5 h-4 bg-border" />
          </div>
        )}
        
        <div className="flex items-center gap-2 flex-1">
          <Avatar className="h-6 w-6">
            <AvatarImage src={reply.author.avatarUrl} />
            <AvatarFallback className="text-xs">
              {getInitials(reply.author.displayName || reply.author.username)}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => setIsCollapsed(false)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ChevronDown className="h-3 w-3" />
            <span>{reply.author.displayName}</span>
            <span className="text-muted-foreground">({reply.replies?.length || 0} replies)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id={`reply-${reply.id}`} className={cn("flex gap-2", depth > 0 && "ml-8")}>
      {/* Connection line */}
      {depth > 0 && (
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="w-0.5 h-full bg-border" />
        </div>
      )}

      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={reply.author.avatarUrl} />
        <AvatarFallback className="text-xs">
          {getInitials(reply.author.displayName || reply.author.username)}
        </AvatarFallback>
      </Avatar>

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

        {/* Action Buttons - Same design as posts but bg only on hover */}
        <div className="flex items-center gap-2">
          {/* Vote Buttons - Act like one button */}
          <div className="flex items-center rounded-[25px] bg-muted/50 overflow-hidden">
            <button
              onClick={() => handleVote("upvote")}
              disabled={toggleReaction.isPending}
              className={cn(
                "flex items-center gap-2 px-4 py-2 transition-colors cursor-pointer hover:bg-muted",
                isUpvoted && "text-primary",
                toggleReaction.isPending && "opacity-50 cursor-not-allowed"
              )}
            >
              <ArrowBigUp className={cn("h-4 w-4", isUpvoted && "fill-current")} />
              {displayScore > 0 && <span className="text-sm">{displayScore}</span>}
            </button>
            <div className="h-6 w-px bg-border" />
            <button
              onClick={() => handleVote("downvote")}
              disabled={toggleReaction.isPending}
              className={cn(
                "flex items-center gap-2 px-4 py-2 transition-colors cursor-pointer hover:bg-muted",
                isDownvoted && "text-primary",
                toggleReaction.isPending && "opacity-50 cursor-not-allowed"
              )}
            >
              <ArrowBigDown className={cn("h-4 w-4", isDownvoted && "fill-current")} />
            </button>
          </div>
          
          {/* Reply Button */}
          {isSignedIn && depth < maxDepth && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-xs text-muted-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              Reply
            </button>
          )}
          
          {/* Share Button */}
          <div onClick={(e) => e.stopPropagation()}>
            <ShareDropdown
              shareUrl={replyUrl}
              title={`Reply by ${reply.author.displayName}`}
              variant="ghost"
              size="sm"
              showLabel={false}
              className="rounded-lg hover:bg-muted/50 h-auto px-3 py-2"
            />
          </div>
          
          {/* Three Dot Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer hover:bg-muted/50"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAuthor && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit();
                    }}
                    className="cursor-pointer"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className="cursor-pointer text-destructive"
                    disabled={deleteReply.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Reply
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleReport();
                }}
                className="cursor-pointer"
              >
                <Flag className="h-4 w-4 mr-2" />
                Report Reply
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Collapse Button */}
          {hasReplies && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-xs text-muted-foreground"
            >
              <ChevronUp className="h-4 w-4" />
              Hide {reply.replies.length} {reply.replies.length === 1 ? "reply" : "replies"}
            </button>
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

        {/* Nested Replies - With connection lines */}
        {hasReplies && (
          <div className={cn("mt-2 space-y-2")}>
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
