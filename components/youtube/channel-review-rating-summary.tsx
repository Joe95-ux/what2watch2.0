"use client";

import { Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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

/** Curator dialog: bordered track reads clearly on Safari (avoids flat muted-on-muted) */
const MODAL_HISTOGRAM_TRACK =
  "box-border border border-border/90 bg-card shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)] dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.45)]";

function RatingHistogramRows({
  distribution,
  maxCount,
  compact,
  /** Curator modal: distinct track so bars read on Safari vs section bg */
  trackClassName,
}: {
  distribution: ReturnType<typeof buildDistribution>;
  maxCount: number;
  /** Modal mobile & reviews tab (compact column): tighter bars, spacing, count */
  compact?: boolean;
  trackClassName?: string;
}) {
  return (
    <div
      className={cn("min-w-0 w-full", compact ? "space-y-0" : "space-y-2.5")}
    >
      {distribution.map((row) => {
        const barWidth = maxCount > 0 ? (row.count / maxCount) * 100 : 0;
        return (
          <div
            key={row.rating}
            className={cn(
              "flex items-center",
              compact ? "gap-1.5" : "gap-2 sm:gap-3"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-end shrink-0 gap-px sm:gap-0.5",
                compact
                  ? "w-[4.5rem] gap-px [&_svg]:h-2.5 [&_svg]:w-2.5"
                  : "w-[5.75rem] sm:w-[6.25rem]"
              )}
              aria-label={`${row.rating} star${row.rating === 1 ? "" : "s"}`}
            >
              {Array.from({ length: row.rating }, (_, i) => (
                <Star key={i} className={MUTED_STAR} aria-hidden />
              ))}
            </div>
            <div
              className={cn(
                "flex-1 min-w-0 rounded-full overflow-hidden",
                compact ? "h-1.5" : "h-2.5",
                trackClassName ?? "bg-muted"
              )}
            >
              <div
                className="h-full rounded-full bg-primary/90 transition-all"
                style={{ width: `${barWidth}%` }}
                role="presentation"
              />
            </div>
            <span
              className={cn(
                "text-xs text-muted-foreground tabular-nums text-right shrink-0",
                compact ? "w-6" : "w-8"
              )}
            >
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
    const countLabel =
      totalReviews === 0
        ? "No ratings yet"
        : `${totalReviews} rating${totalReviews === 1 ? "" : "s"}`;

    return (
      <div className={className}>
        {/* max-lg: same flex + compact layout as curator modal (mobile) */}
        <div className="lg:hidden">
          <div className="flex flex-row items-start gap-2 min-w-0">
            <div className="flex flex-col items-start gap-0.5 shrink-0 text-left">
              <div className="flex items-baseline gap-0.5">
                <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
                  {avgDisplay}
                </span>
                <span className="text-xs font-medium text-muted-foreground">/5</span>
              </div>
              <p className="text-[13px] leading-tight text-muted-foreground">
                {countLabel}
              </p>
            </div>
            <RatingHistogramRows
              distribution={distribution}
              maxCount={maxCount}
              compact
            />
          </div>
        </div>

        {/* lg+: two-column page — stacked summary + full histogram */}
        <div className="hidden lg:flex flex-col gap-6">
          <div className="text-left">
            <p className="text-3xl sm:text-4xl font-bold tabular-nums tracking-tight text-foreground">
              <span>{avgDisplay}</span>
              <span className="text-lg sm:text-xl font-semibold text-muted-foreground">
                {" "}
                out of 5
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">{countLabel}</p>
          </div>
          <RatingHistogramRows distribution={distribution} maxCount={maxCount} />
        </div>
      </div>
    );
  }

  // modal: max-sm = flex row (avg + count stacked | compact chart); sm+ = grid
  const countLabel =
    totalReviews === 0
      ? "No ratings yet"
      : `${totalReviews} rating${totalReviews === 1 ? "" : "s"}`;

  return (
    <div className={className}>
      <div className="flex sm:hidden flex-row items-start gap-2 min-w-0">
        <div className="flex flex-col items-start gap-0.5 shrink-0 text-left">
          <div className="flex items-baseline gap-0.5">
            <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
              {avgDisplay}
            </span>
            <span className="text-xs font-medium text-muted-foreground">/5</span>
          </div>
          <p className="text-[13px] leading-tight text-muted-foreground">
            {countLabel}
          </p>
        </div>
        <RatingHistogramRows
          distribution={distribution}
          maxCount={maxCount}
          compact
          trackClassName={MODAL_HISTOGRAM_TRACK}
        />
      </div>

      <div className="hidden sm:grid sm:grid-cols-[7.5rem_1fr] gap-6 sm:gap-8 items-start">
        <div className="w-full min-w-0 text-left">
          <div className="flex flex-col items-start justify-center gap-0.5">
            <div className="flex items-baseline gap-0.5">
              <span className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight text-foreground">
                {avgDisplay}
              </span>
              <span className="text-lg text-muted-foreground font-medium">/5</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{countLabel}</p>
          </div>
        </div>
        <RatingHistogramRows
          distribution={distribution}
          maxCount={maxCount}
          trackClassName={MODAL_HISTOGRAM_TRACK}
        />
      </div>
    </div>
  );
}
