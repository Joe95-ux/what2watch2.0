"use client";

import { useMemo, useState } from "react";
import { ChannelReview, useChannelReviews } from "@/hooks/use-youtube-channel-reviews";
import { ChannelReviewCard } from "./channel-review-card";
import { ChannelReviewFormSheet } from "./channel-review-form-sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import { Sparkles, MessageCircle, Trophy, Award } from "lucide-react";
import { useReviewBadges, useReviewLeaderboard } from "@/hooks/use-youtube-review-leaderboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const PAGE_SIZE = 6;
const SORT_OPTIONS = [
  { value: "helpful", label: "Most helpful" },
  { value: "newest", label: "Newest" },
  { value: "highest", label: "Highest rating" },
  { value: "lowest", label: "Lowest rating" },
];

interface YouTubeChannelReviewsProps {
  channelId: string;
  channelTitle: string;
  channelThumbnail?: string | null;
}

export function YouTubeChannelReviews({
  channelId,
  channelTitle,
  channelThumbnail,
}: YouTubeChannelReviewsProps) {
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("helpful");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ChannelReview | null>(null);

  const { data, isLoading, isFetching, isError } = useChannelReviews(channelId, {
    page,
    limit: PAGE_SIZE,
    rating: ratingFilter,
    sort,
    tag: tagFilter,
  });
  const { data: leaderboard = [], isLoading: isLoadingLeaderboard } = useReviewLeaderboard();
  const { data: badgesData, isLoading: isLoadingBadges } = useReviewBadges();

  const stats = data?.stats;
  const viewerState = data?.viewerState;
  const reviews = data?.reviews ?? [];
  const pagination = data?.pagination;

  const averageRatingDisplay = useMemo(() => {
    if (!stats) return "–";
    return stats.averageRating ? stats.averageRating.toFixed(1) : "–";
  }, [stats]);

  const handleRequireAuth = (action: () => void) => {
    if (!isSignedIn) {
      toast.info("Sign in to review channels.");
      if (openSignIn) {
        openSignIn({
          afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
        });
      }
      return false;
    }
    action();
    return true;
  };

  const handleWriteReview = () => {
    const proceed = handleRequireAuth(() => {
      if (viewerState?.hasReview && viewerState.reviewId) {
        const existing = reviews.find((review) => review.id === viewerState.reviewId);
        setEditingReview(existing ?? null);
      } else if (viewerState?.reviewDraft) {
        setEditingReview({
          id: viewerState.reviewDraft.id,
          channelId,
          userId: viewerState.userId ?? "",
          rating: viewerState.reviewDraft.rating,
          title: viewerState.reviewDraft.title,
          content: viewerState.reviewDraft.content,
          tags: viewerState.reviewDraft.tags,
          helpfulCount: 0,
          isEdited: false,
          status: "published",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: {
            id: viewerState.userId ?? "",
            username: null,
            displayName: null,
            avatarUrl: null,
          },
          viewerHasVoted: false,
          canEdit: true,
        } as ChannelReview);
      } else {
        setEditingReview(null);
      }
      setIsSheetOpen(true);
    });

    return proceed;
  };

  const handleEditReview = (review: ChannelReview) => {
    setEditingReview(review);
    setIsSheetOpen(true);
  };

  const handleTagClick = (tag: string) => {
    setTagFilter(tag);
    setPage(1);
  };

  const handleChangeRatingFilter = (value: number | null) => {
    setRatingFilter(value);
    setPage(1);
  };

  const renderDistribution = () => {
    if (!stats) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {stats.ratingDistribution.map((entry) => (
          <button
            key={entry.rating}
            onClick={() =>
              handleChangeRatingFilter(ratingFilter === entry.rating ? null : entry.rating)
            }
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors",
              ratingFilter === entry.rating ? "border-primary/50 bg-primary/5" : "hover:bg-muted/50"
            )}
          >
            <span className="w-10 text-sm font-medium">{entry.rating}★</span>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${entry.percentage}%` }}
                />
              </div>
            </div>
            <span className="text-sm text-muted-foreground">{entry.count}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderTagCloud = () => {
    if (!stats || stats.tags.length === 0) {
      return <p className="text-sm text-muted-foreground">No tags yet.</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {stats.tags.map((tag) => (
          <Badge
            key={tag.tag}
            variant={tagFilter === tag.tag ? "default" : "secondary"}
            className="cursor-pointer rounded-full px-3 py-1 text-xs font-medium"
            onClick={() => handleTagClick(tag.tag)}
          >
            {tag.tag} • {tag.count}
          </Badge>
        ))}
        {tagFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer text-xs"
            onClick={() => setTagFilter(null)}
          >
            Clear tags
          </Button>
        )}
      </div>
    );
  };

  const renderLeaderboardSection = () => (
    <div className="rounded-3xl border border-border bg-card/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Leaderboard</p>
          <h3 className="text-lg font-semibold">Top reviewers</h3>
        </div>
        <Trophy className="h-5 w-5 text-yellow-500" />
      </div>
      {isLoadingLeaderboard ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviewers have shared insights yet.</p>
      ) : (
        <div className="space-y-3">
          {leaderboard.slice(0, 5).map((entry) => {
            const label =
              entry.user?.displayName ||
              entry.user?.username ||
              `Reviewer ${entry.userId.slice(0, 6)}`;
            const initials = label
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={entry.userId}
                className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/40 p-3"
              >
                <div className="text-lg font-semibold w-6 text-center text-muted-foreground">
                  {entry.rank}
                </div>
                <Avatar className="h-10 w-10">
                  {entry.user?.avatarUrl ? (
                    <AvatarImage src={entry.user.avatarUrl} alt={label} />
                  ) : (
                    <AvatarFallback>{initials}</AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.reviewCount} reviews · {entry.helpfulVotes} helpful votes
                  </p>
                </div>
                <div className="flex gap-1">
                  {entry.badges.slice(0, 2).map((badge) => (
                    <span key={badge.slug} title={badge.name} className="text-lg">
                      {badge.icon ?? "🏅"}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderBadgeShowcase = () => {
    const badgeDefinitions = badgesData?.badges || [];
    const userBadges = badgesData?.userBadges || [];
    const stats = badgesData?.stats;

    return (
      <div className="rounded-3xl border border-border bg-card/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Badges</p>
            <h3 className="text-lg font-semibold">Review milestones</h3>
          </div>
          <Award className="h-5 w-5 text-primary" />
        </div>

        {isLoadingBadges ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {stats ? (
              <div className="flex items-center justify-between rounded-2xl border border-border/80 p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Your stats</p>
                  <p className="font-semibold">
                    {stats.totalReviews} reviews · {stats.helpfulVotes} helpful votes
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {userBadges.length} badges earned
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sign in and start reviewing to earn collectible badges.
              </p>
            )}

            <div className="space-y-2">
              {badgeDefinitions.map((badge) => {
                const earned = userBadges.some((entry) => entry.badge.slug === badge.slug);
                return (
                  <div
                    key={badge.id}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border border-border/70 p-3 text-sm",
                      earned ? "bg-primary/5 border-primary/40" : "bg-background/40"
                    )}
                  >
                    <span className="text-2xl">{badge.icon ?? "🏅"}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {badge.minReviews > 0 && <p>{badge.minReviews}+ reviews</p>}
                      {badge.minHelpfulVotes > 0 && <p>{badge.minHelpfulVotes}+ helpful votes</p>}
                      {earned && <p className="font-semibold text-primary">Earned</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderReviews = () => {
    if (isLoading || isFetching) {
      return (
        <div className="grid gap-4">
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Unable to load reviews right now.
        </div>
      );
    }

    if (reviews.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-10 text-center">
          <MessageCircle className="mb-4 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No reviews yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Be the first to review this channel and help others decide what to watch.
          </p>
          <Button onClick={handleWriteReview} className="cursor-pointer">
            Write a review
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {reviews.map((review) => (
          <ChannelReviewCard
            key={review.id}
            channelId={channelId}
            review={review}
            onEdit={handleEditReview}
            onTagClick={handleTagClick}
          />
        ))}
      </div>
    );
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between pt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <p className="text-sm text-muted-foreground">
          Page {pagination.page} of {pagination.totalPages}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={page >= pagination.totalPages}
        >
          Next
        </Button>
      </div>
    );
  };

  return (
    <section className="mt-12 rounded-3xl border border-border bg-background/70 p-6 shadow-sm backdrop-blur">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Channel reviews</p>
          <h2 className="text-2xl font-bold">{channelTitle} community insights</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={sort} onValueChange={(value) => setSort(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort reviews" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleWriteReview} className="cursor-pointer gap-2">
            <Sparkles className="h-4 w-4" />
            {viewerState?.hasReview ? "Edit your review" : "Write a review"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <div className="mb-4 space-y-2 text-center">
            <p className="text-sm text-muted-foreground">Average rating</p>
            <p className="text-5xl font-bold">{averageRatingDisplay}</p>
            <p className="text-xs text-muted-foreground">
              {stats?.totalReviews ?? 0} {stats?.totalReviews === 1 ? "review" : "reviews"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ratings</p>
            <div className="mt-3">{renderDistribution()}</div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="uppercase tracking-wide text-muted-foreground">Tags</span>
              {tagFilter && (
                <button
                  onClick={() => setTagFilter(null)}
                  className="text-[11px] text-primary hover:text-primary/80"
                >
                  Clear
                </button>
              )}
            </div>
            {renderTagCloud()}
          </div>
        </div>

        <div className="space-y-6">
          {renderReviews()}
          {renderPagination()}
        </div>
      </div>

      <ChannelReviewFormSheet
        channelId={channelId}
        channelTitle={channelTitle}
        channelThumbnail={channelThumbnail}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        initialReview={editingReview}
      />
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {renderLeaderboardSection()}
        {renderBadgeShowcase()}
      </div>
    </section>
  );
}


