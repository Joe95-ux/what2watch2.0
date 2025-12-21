"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, MoreVertical, Flag, Edit, Trash2, ChevronDown, ChevronUp, Eye, Bell, BellOff, Bookmark, BookmarkCheck } from "lucide-react";
import { BiSolidUpvote, BiSolidDownvote } from "react-icons/bi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateReplyForm } from "./create-reply-form";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useForumReplyReaction, useToggleForumReplyLike } from "@/hooks/use-forum-reactions";
import { useReplySubscription, useSubscribeToReply, useUnsubscribeFromReply } from "@/hooks/use-forum-reply-subscription";
import { useReplyBookmark, useBookmarkReply, useUnbookmarkReply } from "@/hooks/use-forum-reply-bookmarks";
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
import { ReportDialog } from "./report-dialog";
import { SafeHtmlContent } from "./safe-html-content";
import { EditReplyDialog } from "./edit-reply-dialog";

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
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const maxDepth = 5;

  const isAuthor = currentUser?.id === reply.author.id;

  const { data: reaction } = useForumReplyReaction(reply.id);
  const toggleReaction = useToggleForumReplyLike(reply.id);
  const { data: subscription } = useReplySubscription(reply.id);
  const subscribeToReply = useSubscribeToReply(reply.id);
  const unsubscribeFromReply = useUnsubscribeFromReply(reply.id);
  const { data: bookmarkData } = useReplyBookmark(reply.id);
  const isBookmarked = bookmarkData?.bookmarked || false;
  const bookmarkReply = useBookmarkReply(reply.id);
  const unbookmarkReply = useUnbookmarkReply(reply.id);

  const userReaction = reaction?.reactionType || null;
  const isUpvoted = userReaction === "upvote";
  const isDownvoted = userReaction === "downvote";
  const displayScore = reaction?.score ?? reply.score ?? reply.likes ?? 0;
  const isSubscribed = subscription?.subscribed || false;

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

  const handleReport = async (reason: string, description?: string) => {
    setIsReporting(true);
    try {
      const response = await fetch(`/api/forum/replies/${reply.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, description }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to report reply");
      }

      toast.success("Reply reported successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to report reply");
    } finally {
      setIsReporting(false);
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
    setIsEditDialogOpen(true);
  };

  const replyUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/forum/${postId}#reply-${reply.id}` 
    : `/forum/${postId}#reply-${reply.id}`;

  const hasReplies = reply.replies && reply.replies.length > 0;

  if (isCollapsed) {
    return (
      <div className={cn("flex gap-2", depth > 0 && "ml-8 border-l-2 border-border pl-4")}>
        <div className="flex items-center gap-2 flex-1">
          <Avatar className="h-9 w-9">
            <AvatarImage src={reply.author.avatarUrl} />
            <AvatarFallback className="text-xs">
              {getInitials(reply.author.username || reply.author.displayName)}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => setIsCollapsed(false)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ChevronDown className="h-3 w-3" />
            <span>{reply.author.username || reply.author.displayName}</span>
            <span className="text-muted-foreground">({reply.replies?.length || 0} replies)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id={`reply-${reply.id}`} className={cn("flex gap-2", depth > 0 && "ml-8 border-l-2 border-border pl-4")}>
      <Avatar className="h-9 w-9 flex-shrink-0">
        <AvatarImage src={reply.author.avatarUrl} />
        <AvatarFallback className="text-xs">
          {getInitials(reply.author.username || reply.author.displayName)}
        </AvatarFallback>
      </Avatar>

      {/* Reply Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <Link
            href={`/users/${reply.author.username || reply.author.id}`}
            className="text-xs font-semibold hover:underline"
          >
            {reply.author.username || reply.author.displayName}
          </Link>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
          </span>
        </div>

        <SafeHtmlContent 
          content={reply.content}
          className="text-[0.9rem] mb-2 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2"
        />

        {/* Action Buttons - Reddit style: upvote | count | downvote */}
        <div className="flex items-center gap-0">
          <div className="flex items-center rounded-[25px] overflow-hidden">
            <button
              onClick={() => handleVote("upvote")}
              disabled={toggleReaction.isPending}
              className={cn(
                "flex items-center justify-center px-2 py-2 transition-colors cursor-pointer",
                "hover:bg-[#6B7280]/30 dark:hover:bg-muted",
                toggleReaction.isPending && "opacity-50 cursor-not-allowed"
              )}
            >
              <BiSolidUpvote className={cn(
                "h-4 w-4 [stroke-width:2px]",
                isUpvoted 
                  ? "stroke-orange-500 dark:stroke-orange-500 fill-orange-500 dark:fill-orange-500" 
                  : "stroke-current fill-transparent dark:fill-transparent"
              )} />
            </button>
            <span className={cn(
              "text-sm font-medium min-w-[1rem] text-center px-1",
              isUpvoted && "text-orange-500",
              isDownvoted && "text-blue-500"
            )}>
              {displayScore === 0 ? "Vote" : displayScore}
            </span>
            <button
              onClick={() => handleVote("downvote")}
              disabled={toggleReaction.isPending}
              className={cn(
                "flex items-center justify-center px-2 py-2 transition-colors cursor-pointer",
                "hover:bg-[#6B7280]/30 dark:hover:bg-muted",
                toggleReaction.isPending && "opacity-50 cursor-not-allowed"
              )}
            >
              <BiSolidDownvote className={cn(
                "h-4 w-4 [stroke-width:2px]",
                isDownvoted 
                  ? "stroke-blue-500 dark:stroke-blue-500 fill-blue-500 dark:fill-blue-500" 
                  : "stroke-current fill-transparent dark:fill-transparent"
              )} />
            </button>
          </div>
          
          {/* Reply Button */}
          {isSignedIn && depth < maxDepth && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center gap-2 px-3 py-2 rounded-[25px] hover:bg-muted/50 transition-colors cursor-pointer text-xs text-muted-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              Reply
            </button>
          )}
          
          {/* Share Button */}
          <div onClick={(e) => e.stopPropagation()}>
            <ShareDropdown
              shareUrl={replyUrl}
              title={`Reply by ${reply.author.username || reply.author.displayName}`}
              variant="ghost"
              size="sm"
              showLabel={true}
              className="rounded-[25px] hover:bg-muted/50 h-auto px-3 py-2"
            />
          </div>
          
          {/* Three Dot Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer hover:bg-muted/50 rounded-[25px]"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isSignedIn && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSubscribed) {
                        unsubscribeFromReply.mutate();
                      } else {
                        subscribeToReply.mutate();
                      }
                    }}
                    className="cursor-pointer"
                    disabled={subscribeToReply.isPending || unsubscribeFromReply.isPending}
                  >
                    {isSubscribed ? (
                      <>
                        <BellOff className="h-4 w-4 mr-2" />
                        Unfollow Comment
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4 mr-2" />
                        Follow Comment
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isBookmarked) {
                        unbookmarkReply.mutate();
                      } else {
                        bookmarkReply.mutate();
                      }
                    }}
                    className="cursor-pointer"
                    disabled={bookmarkReply.isPending || unbookmarkReply.isPending}
                  >
                    {isBookmarked ? (
                      <>
                        <BookmarkCheck className="h-4 w-4 mr-2" />
                        Unsave Comment
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-4 w-4 mr-2" />
                        Save Comment
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
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
                  setIsReportDialogOpen(true);
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
              className="flex items-center gap-1 px-3 py-2 rounded-[25px] hover:bg-muted/50 transition-colors cursor-pointer text-xs text-muted-foreground"
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

        {/* Nested Replies */}
        {hasReplies && (
          <div className="mt-2 space-y-2">
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

      {/* Report Dialog */}
      <ReportDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        onSubmit={handleReport}
        type="reply"
        isPending={isReporting}
      />

      {/* Edit Dialog */}
      <EditReplyDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        reply={{
          id: reply.id,
          content: reply.content,
        }}
        postId={postId}
      />
    </div>
  );
}
