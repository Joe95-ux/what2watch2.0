"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, ThumbsUp, HelpCircle, MoreVertical, Share2, Facebook, Twitter, Mail, Link2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToggleReviewReaction } from "@/hooks/use-reviews";
import type { Review } from "@/hooks/use-reviews";
import { useUser } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import ReportReviewDialog from "./report-review-dialog";

interface ReviewCardProps {
  review: Review;
  showFullContent?: boolean;
}

export default function ReviewCard({
  review,
  showFullContent = false,
}: ReviewCardProps) {
  const { user } = useUser();
  const toggleReaction = useToggleReviewReaction();
  const [isExpanded, setIsExpanded] = useState(showFullContent);
  const [helpfulLoading, setHelpfulLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayName =
    review.user.displayName || review.user.username || "Anonymous";
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

  const handleLike = async () => {
    setLikeLoading(true);
    try {
      await toggleReaction.mutateAsync({
        reviewId: review.id,
        reactionType: "like",
      });
    } finally {
      setLikeLoading(false);
    }
  };

  const helpfulCount = review.reactionCounts["helpful"] || 0;
  const likeCount = review.reactionCounts["like"] || 0;
  
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
    } catch (error) {
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

  return (
    <div 
      id={`review-${review.id}`} 
      className={cn(
        "bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow scroll-mt-4",
        !isExpanded && hasMoreContent && "flex flex-col"
      )}
    >
      <div className="flex items-start gap-4 mb-4">
        <Link
          href={`/user/${review.user.username || review.user.id}`}
          className="flex-shrink-0"
        >
          {avatarUrl ? (
            <div className="relative w-10 h-10 rounded-full overflow-hidden">
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm font-medium">{initials}</span>
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/user/${review.user.username || review.user.id}`}
                className="font-semibold hover:text-primary transition-colors cursor-pointer"
              >
                {displayName}
              </Link>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(review.createdAt), {
                  addSuffix: true,
                })}
              </span>
              {review.isFeatured && (
                <>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    Featured
                  </span>
                </>
              )}
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
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setReportDialogOpen(true)}
                  variant="destructive"
                  className="cursor-pointer"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Report Review
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2 mb-2">
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
          </div>
        </div>
      </div>

      {review.title && (
        <h3 className="font-semibold mb-2 text-lg">{review.title}</h3>
      )}
      <div className="mb-4">
        <p className={cn(
          "text-muted-foreground",
          shouldTruncate ? "line-clamp-3" : "whitespace-pre-wrap"
        )}>
          {displayContent}
          {shouldTruncate && "..."}
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
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleHelpful}
          disabled={helpfulLoading}
          className={cn(
            "cursor-pointer",
            hasUserReacted("helpful") && "text-primary"
          )}
        >
          <HelpCircle className="h-4 w-4 mr-1" />
          Helpful ({helpfulCount})
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          disabled={likeLoading}
          className={cn(
            "cursor-pointer",
            hasUserReacted("like") && "text-primary"
          )}
        >
          <ThumbsUp className="h-4 w-4 mr-1" />
          Like ({likeCount})
        </Button>
        {review.totalReactions > 0 && (
          <span className="text-sm text-muted-foreground">
            {review.totalReactions} reaction
            {review.totalReactions !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <ReportReviewDialog
        isOpen={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        reviewId={review.id}
      />
    </div>
  );
}

