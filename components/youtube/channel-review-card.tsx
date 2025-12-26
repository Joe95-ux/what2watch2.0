"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  MoreVertical,
  Edit,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Tag,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChannelReview, useDeleteChannelReview, useToggleChannelReviewVote } from "@/hooks/use-youtube-channel-reviews";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";

interface ChannelReviewCardProps {
  channelId: string;
  review: ChannelReview;
  onEdit: (review: ChannelReview) => void;
  onTagClick?: (tag: string) => void;
}

const MAX_REVIEW_LENGTH = 300; // Characters to show before truncating

export function ChannelReviewCard({
  channelId,
  review,
  onEdit,
  onTagClick,
}: ChannelReviewCardProps) {
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const toggleVote = useToggleChannelReviewVote(channelId);
  const deleteReview = useDeleteChannelReview(channelId);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const displayName = review.user.username || review.user.displayName || "Anonymous";
  const canEdit = review.canEdit;
  
  // Show more/less logic
  const shouldTruncate = review.content.length > MAX_REVIEW_LENGTH;
  const displayContent = shouldTruncate && !isExpanded
    ? review.content.slice(0, MAX_REVIEW_LENGTH)
    : review.content;

  const handleRequireAuth = async (action: () => Promise<void> | void) => {
    if (!isSignedIn) {
      toast.error("Sign in to continue.");
      if (openSignIn) {
        openSignIn({
          afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
        });
      }
      return;
    }
    await action();
  };

  const handleVote = (voteType: "UP" | "DOWN") =>
    handleRequireAuth(async () => {
      try {
        await toggleVote.mutateAsync({ reviewId: review.id, voteType });
        const currentVoteType = review.viewerVoteType;
        if (currentVoteType === voteType) {
          toast.success("Vote removed");
        } else {
          toast.success(voteType === "UP" ? "Helpful vote added" : "Not helpful vote added");
        }
      } catch (error: unknown) {
        console.error("[ChannelReviewCard] vote error", error);
        if (error && typeof error === "object" && "code" in error && error.code === "OWNER_CANNOT_VOTE") {
          toast.info("You cannot vote on your own review");
        } else {
          toast.error("Unable to update vote.");
        }
      }
    });

  const handleDelete = () =>
    handleRequireAuth(async () => {
      try {
        await deleteReview.mutateAsync(review.id);
        toast.success("Review deleted.");
        setIsDeleteDialogOpen(false);
      } catch (error) {
        console.error("[ChannelReviewCard] delete error", error);
        toast.error("Unable to delete review.");
      }
    });

  return (
    <div className="relative">
      {/* Card with tooltip-style connection pointing down to username */}
      <div className="relative rounded-2xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur mb-2">
        {/* Tooltip arrow pointing down from card to username */}
        <div className="absolute -bottom-[6px] left-[23px] h-[10px] w-[10px] rotate-45 border-r border-b border-border bg-card/60" />

        <div className="space-y-3">
          {/* Rating - aligned with content */}
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className={cn(
                  "h-4 w-4",
                  index < review.rating
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-muted-foreground"
                )}
              />
            ))}
            <span className="text-sm font-medium text-muted-foreground">{review.rating}/5</span>
          </div>

          {/* Title - aligned with content */}
          {review.title && <p className="text-base font-semibold">{review.title}</p>}

          {/* Review content */}
          <div>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {displayContent}
              {shouldTruncate && !isExpanded && "..."}
            </p>
            {shouldTruncate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 cursor-pointer"
              >
                {isExpanded ? "Show less" : "Show more"}
              </Button>
            )}
          </div>

          {/* Summary Tags */}
          {review.summaryTags && review.summaryTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {review.summaryTags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs font-medium bg-primary/10 text-primary border-primary/20"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Tags */}
          {review.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              {review.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer bg-muted/70 text-xs font-medium capitalize hover:bg-muted"
                  onClick={() => onTagClick?.(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleVote("UP");
                }}
                disabled={toggleVote.isPending}
                className="cursor-pointer gap-2"
              >
                <ThumbsUp
                  className={cn(
                    "h-4 w-4",
                    review.viewerVoteType === "UP" && "fill-black dark:fill-white"
                  )}
                />
                Helpful
                <span className="text-xs font-medium text-muted-foreground">
                  {review.helpfulCount}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleVote("DOWN");
                }}
                disabled={toggleVote.isPending}
                className="cursor-pointer gap-2"
              >
                <ThumbsDown
                  className={cn(
                    "h-4 w-4",
                    review.viewerVoteType === "DOWN" && "fill-black dark:fill-white"
                  )}
                />
                Not Helpful
                <span className="text-xs font-medium text-muted-foreground">
                  {review.notHelpfulCount ?? 0}
                </span>
              </Button>
            </div>

            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-40"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEdit(review);
                    }}
                    className="cursor-pointer gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit review
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDeleteDialogOpen(true);
                    }}
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Username and Date - Below the card, like tooltip target */}
      <div className="flex items-center gap-2">
        <p className="font-semibold text-sm">{displayName}</p>
        <span className="text-muted-foreground">•</span>
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
        </span>
        {review.isEdited && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">(edited)</span>
          </>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete review?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone and will permanently remove your review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteReview.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteReview.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


