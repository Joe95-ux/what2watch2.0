"use client";

import { Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChannelReviewStats } from "@/hooks/use-youtube-channel-reviews";

export interface ChannelReviewRatingSummaryProps {
  reviewStats: ChannelReviewStats | null | undefined;
  isReviewStatsLoading?: boolean;
  /** Fallback when stats not loaded */
  channelRating?: { average: number; count: number } | null;
  variant: "modal" | "sidebar";
  className?: string;
}

function buildDistribution(reviewStats: ChannelReviewStats | null | undefined) {
  return reviewStats?.ratingDistribution?.length === 5
    ? [...reviewStats.ratingDistribution].sort((a, b) => b.rating - a.rating)
    : [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: 0,
        percentage: 0,
      }));
}

const MUTED_STAR =
  "h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 fill-muted-foreground/35 text-muted-foreground/45";

function RatingHistogramRows({
  distribution,
  maxCount,
}: {
  distribution: ReturnType<typeof buildDistribution>;
  maxCount: number;
}) {
  return (
    <div className="space-y-2.5 min-w-0 w-full">
      {distribution.map((row) => {
        const barWidth = maxCount > 0 ? (row.count / maxCount) * 100 : 0;
        return (
          <div key={row.rating} className="flex items-center gap-2 sm:gap-3">
            <div
              className="flex items-center justify-end gap-px sm:gap-0.5 shrink-0 w-[5.75rem] sm:w-[6.25rem]"
              aria-label={`${row.rating} star${row.rating === 1 ? "" : "s"}`}
            >
              {Array.from({ length: row.rating }, (_, i) => (
                <Star key={i} className={MUTED_STAR} aria-hidden />
              ))}
            </div>
            <div className="flex-1 min-w-0 h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/90 transition-all"
                style={{ width: `${barWidth}%` }}
                role="presentation"
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">
              {row.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ChannelReviewRatingSummary({
  reviewStats,
  isReviewStatsLoading,
  channelRating,
  variant,
  className,
}: ChannelReviewRatingSummaryProps) {
  const totalReviews = reviewStats?.totalReviews ?? channelRating?.count ?? 0;
  const averageRating =
    reviewStats != null && reviewStats.totalReviews > 0
      ? reviewStats.averageRating
      : channelRating != null && channelRating.count > 0
        ? channelRating.average
        : null;

  const avgDisplay =
    averageRating != null && !Number.isNaN(averageRating)
      ? Number(averageRating).toFixed(1)
      : "—";

  const distribution = buildDistribution(reviewStats);
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  if (isReviewStatsLoading && !reviewStats) {
    return (
      <div className={className}>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full max-w-[12rem]" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={className}>
        <div className="flex flex-col gap-6">
          <div className="text-left">
            <p className="text-3xl sm:text-4xl font-bold tabular-nums tracking-tight text-foreground">
              <span>{avgDisplay}</span>
              <span className="text-lg sm:text-xl font-semibold text-muted-foreground">
                {" "}
                out of 5
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {totalReviews === 0
                ? "No ratings yet"
                : `${totalReviews} rating${totalReviews === 1 ? "" : "s"}`}
            </p>
          </div>
          <RatingHistogramRows distribution={distribution} maxCount={maxCount} />
        </div>
      </div>
    );
  }

  // modal: side-by-side large average + histogram
  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-[7.5rem_1fr] gap-6 sm:gap-8 items-start">
        <div className="flex flex-col items-center sm:items-start justify-center gap-0.5">
          <div className="flex items-baseline gap-0.5">
            <span className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight text-foreground">
              {avgDisplay}
            </span>
            <span className="text-lg text-muted-foreground font-medium">/5</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalReviews === 0
              ? "No ratings yet"
              : `${totalReviews} rating${totalReviews === 1 ? "" : "s"}`}
          </p>
        </div>
        <RatingHistogramRows distribution={distribution} maxCount={maxCount} />
      </div>
    </div>
  );
}
