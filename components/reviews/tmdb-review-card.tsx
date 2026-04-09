"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TMDBReview } from "@/hooks/use-reviews";
import { formatDistanceToNow } from "date-fns";

interface TMDBReviewCardProps {
  review: TMDBReview;
  showFullContent?: boolean;
}

export default function TMDBReviewCard({
  review,
  showFullContent = false,
}: TMDBReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(showFullContent);

  const authorName = review.author_details.name || review.author;
  const avatarPath = review.author_details.avatar_path;
  const rating = review.author_details.rating;
  
  // TMDB avatar paths can be relative or absolute
  const avatarUrl = avatarPath
    ? avatarPath.startsWith("http")
      ? avatarPath
      : `https://image.tmdb.org/t/p/w45${avatarPath}`
    : null;

  const MAX_REVIEW_LENGTH = 500;
  const shouldTruncate = review.content.length > MAX_REVIEW_LENGTH && !isExpanded;
  const displayContent = shouldTruncate
    ? review.content.slice(0, MAX_REVIEW_LENGTH).trim() + "..."
    : review.content;

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4 mb-4">
        {avatarUrl ? (
          <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            <Image
              src={avatarUrl}
              alt={authorName}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium">
              {authorName[0]?.toUpperCase() || "?"}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{authorName}</span>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(review.created_at), {
                  addSuffix: true,
                })}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                TMDB
              </span>
            </div>
            {review.url && (
              <a
                href={review.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                View on TMDB
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {rating !== null && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-3 w-3",
                      i < rating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">{rating}/10</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <p className={cn(
          "text-muted-foreground whitespace-pre-wrap",
          shouldTruncate && "line-clamp-4"
        )}>
          {displayContent}
        </p>
        {review.content.length > MAX_REVIEW_LENGTH && (
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
    </div>
  );
}

