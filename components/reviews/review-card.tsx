"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, ThumbsUp, ThumbsDown, MoreVertical, Facebook, Twitter, Mail, Link2, Flag, ChevronDown, ChevronUp, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { cn } from "@/lib/utils";
import { useToggleReviewReaction, useDeleteReview } from "@/hooks/use-reviews";
import type { Review } from "@/hooks/use-reviews";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import ReportReviewDialog from "./report-review-dialog";
import EditReviewDialog from "./edit-review-dialog";

interface ReviewCardProps {
  review: Review;
  showFullContent?: boolean;
}

export default function ReviewCard({
  review,
  showFullContent = false,
}: ReviewCardProps) {
  const { data: currentUser } = useCurrentUser();
  const toggleReaction = useToggleReviewReaction();
  const deleteReview = useDeleteReview();
  const [isExpanded, setIsExpanded] = useState(showFullContent);
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [helpfulLoading, setHelpfulLoading] = useState(false);
  const [dislikeLoading, setDislikeLoading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if current user is the review author
  const isAuthor = currentUser?.id && review.userId === currentUser.id;

  const displayName =
    review.user.username || review.user.displayName || "Anonymous";
  const avatarUrl = review.user.avatarUrl;
  const initials = displayName[0].toUpperCase();

  const hasUserReacted = (type: string) => {
    return review.userReactions?.includes(type) || false;
  };

  const handleHelpful = async () => {
    setHelpfulLoading(true);
    try {
      await toggleReaction.mutateAsync({
        reviewId: review.id,
        reactionType: "helpful",
      });
    } finally {
      setHelpfulLoading(false);
    }
  };

  const handleDislike = async () => {
    setDislikeLoading(true);
    try {
      await toggleReaction.mutateAsync({
        reviewId: review.id,
        reactionType: "dislike",
      });
    } finally {
      setDislikeLoading(false);
    }
  };

  const helpfulCount = review.reactionCounts["helpful"] || 0;
  const dislikeCount = review.reactionCounts["dislike"] || 0;
  
  // Find first paragraph break (newline or double newline)
  const getFirstParagraph = (text: string): { paragraph: string; hasMore: boolean } => {
    const trimmedText = text.trim();
    
    // Split by double newlines first (paragraph breaks)
    const paragraphs = trimmedText.split(/\n\n+/);
    if (paragraphs.length > 1 && paragraphs[0].trim().length > 0) {
      return { paragraph: paragraphs[0].trim(), hasMore: true };
    }
    
    // If no double newlines, split by single newline
    const lines = trimmedText.split(/\n/);
    if (lines.length > 1 && lines[0].trim().length > 0) {
      return { paragraph: lines[0].trim(), hasMore: true };
    }
    
    // If no newlines, try to find first sentence
    const firstSentenceMatch = trimmedText.match(/^[^.!?]+[.!?]/);
    if (firstSentenceMatch && trimmedText.length > firstSentenceMatch[0].length) {
      return { paragraph: firstSentenceMatch[0].trim(), hasMore: true };
    }
    
    // If text is short, show all
    if (trimmedText.length <= 200) {
      return { paragraph: trimmedText, hasMore: false };
    }
    
    // Fallback: first 200 characters
    return { paragraph: trimmedText.slice(0, 200).trim(), hasMore: true };
  };

  const { paragraph: firstParagraph, hasMore: hasMoreContent } = getFirstParagraph(review.content);
  const shouldTruncate = hasMoreContent && !isExpanded;
  const displayContent = shouldTruncate ? firstParagraph : review.content;

  // Generate review URL - link to the reviews page with anchor
  const reviewUrl = typeof window !== "undefined"
    ? `${window.location.origin}/content/${review.mediaType}/${review.tmdbId}/reviews#review-${review.id}`
    : "";

  const reviewTitle = review.title || `${displayName}'s Review`;
  const reviewText = `${reviewTitle} - ${review.rating}/10\n\n${review.content.substring(0, 200)}...`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShareFacebook = () => {
    const encodedUrl = encodeURIComponent(reviewUrl);
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    window.open(shareUrl, "_blank", "width=600,height=400");
  };

  const handleShareTwitter = () => {
    const encodedUrl = encodeURIComponent(reviewUrl);
    const encodedText = encodeURIComponent(reviewText);
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
    window.open(shareUrl, "_blank", "width=600,height=400");
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Check out this review: ${reviewTitle}`);
    const body = encodeURIComponent(`I found this review interesting:\n\n${reviewUrl}\n\n${reviewText}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleDelete = async () => {
    try {
      await deleteReview.mutateAsync(review.id);
      toast.success("Review deleted successfully");
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete review"
      );
    }
  };

  return (
    <div className="relative" id={`review-${review.id}`}>
      {/* Card with tooltip-style connection pointing down to username */}
      <div className="relative rounded-2xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur mb-2 scroll-mt-4">
        {/* Tooltip arrow pointing down from card to username */}
        <div className="absolute -bottom-[6px] left-[23px] h-[10px] w-[10px] rotate-45 border-r border-b border-border bg-card/60" />

        <div className="space-y-3">
          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3 w-3",
                    i < review.rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-muted-foreground"
                  )}
                />
              ))}
            </div>
            <span className="text-sm font-medium">{review.rating}/10</span>
            {review.isFeatured && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium ml-2">
                Featured
              </span>
            )}
          </div>

          {/* Title */}
          {review.title && (
            <h3 className="font-semibold text-base">{review.title}</h3>
          )}

          {/* Review content */}
          <div>
            {review.containsSpoilers && !showSpoiler ? (
              <>
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <span className="font-medium text-sm">Spoiler</span>
                  <button
                    onClick={() => setShowSpoiler(true)}
                    className="flex items-center gap-1 text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground italic">
                  This review contains spoilers. Click to reveal.
                </p>
              </>
            ) : (
              <>
                {review.containsSpoilers && showSpoiler && (
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <span className="font-medium text-sm">Spoiler</span>
                    <button
                      onClick={() => setShowSpoiler(false)}
                      className="flex items-center gap-1 text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <p className={cn(
                  "text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap",
                  shouldTruncate && !isExpanded && "line-clamp-4"
                )}>
                  {displayContent}
                  {shouldTruncate && !isExpanded && "..."}
                </p>
                {hasMoreContent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-2 cursor-pointer"
                  >
                    {isExpanded ? "Show less" : "Show more"}
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleHelpful}
                disabled={helpfulLoading}
                className={cn(
                  "cursor-pointer gap-2",
                  hasUserReacted("helpful") && "text-primary"
                )}
              >
                <ThumbsUp 
                  className={cn(
                    "h-4 w-4",
                    hasUserReacted("helpful") && "fill-black dark:fill-white"
                  )}
                />
                Helpful
                <span className="text-xs font-medium text-muted-foreground">
                  {helpfulCount}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDislike}
                disabled={dislikeLoading}
                className={cn(
                  "cursor-pointer gap-2",
                  hasUserReacted("dislike") && "text-primary"
                )}
              >
                <ThumbsDown 
                  className={cn(
                    "h-4 w-4",
                    hasUserReacted("dislike") && "fill-black dark:fill-white"
                  )}
                />
                Not Helpful
                <span className="text-xs font-medium text-muted-foreground">
                  {dislikeCount}
                </span>
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isAuthor && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setEditDialogOpen(true)}
                      className="cursor-pointer"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Review
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      variant="destructive"
                      className="cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Review
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleShareFacebook} className="cursor-pointer">
                  <Facebook className="h-4 w-4 mr-2" />
                  Share on Facebook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareTwitter} className="cursor-pointer">
                  <Twitter className="h-4 w-4 mr-2" />
                  Share on X
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareEmail} className="cursor-pointer">
                  <Mail className="h-4 w-4 mr-2" />
                  Share via Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
                  {copied ? (
                    <>
                      <Link2 className="h-4 w-4 mr-2" />
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </DropdownMenuItem>
                {!isAuthor && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setReportDialogOpen(true)}
                      variant="destructive"
                      className="cursor-pointer"
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      Report Review
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Username and Date - Below the card, like tooltip target */}
      <div className="flex items-center gap-2">
        <Link
          href={`/user/${review.user.username || review.user.id}`}
          className="flex items-center gap-2"
        >
          {avatarUrl ? (
            <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium">{initials}</span>
            </div>
          )}
          <span className="font-semibold text-sm hover:text-primary transition-colors cursor-pointer">
            {displayName}
          </span>
        </Link>
        <span className="text-muted-foreground">•</span>
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(review.createdAt), {
            addSuffix: true,
          })}
        </span>
      </div>

      <ReportReviewDialog
        isOpen={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        reviewId={review.id}
      />

      {isAuthor && (
        <>
          <EditReviewDialog
            isOpen={editDialogOpen}
            onClose={() => setEditDialogOpen(false)}
            review={review}
            filmData={{
              title: review.title || "",
              posterPath: null, // We don't have poster path in review, but it's optional
              releaseYear: null,
              runtime: null,
              rating: null,
            }}
          />
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Review</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this review? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleteReview.isPending}
                >
                  {deleteReview.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

