"use client";

import { useState } from "react";
import { ChannelReview, useChannelReviews } from "@/hooks/use-youtube-channel-reviews";
import { ChannelReviewCard } from "./channel-review-card";
import { ChannelReviewFormSheet } from "./channel-review-form-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";

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
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ChannelReview | null>(null);

  const { data, isLoading, isFetching, isError } = useChannelReviews(channelId, {
    page,
    limit: PAGE_SIZE,
    sort,
  });

  const viewerState = data?.viewerState;
  const reviews = data?.reviews ?? [];
  const pagination = data?.pagination;

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

  const renderReviews = () => {
    if (isLoading || isFetching) {
      return (
        <div className="space-y-4">
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Unable to load reviews right now.
        </div>
      );
    }

    if (reviews.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12 border border-border rounded-lg">
          <MessageCircle className="h-10 w-10 mx-auto mb-4 opacity-50" />
          <p className="text-sm mb-4">No reviews yet</p>
          {isSignedIn && (
            <Button
              variant="outline"
              onClick={handleWriteReview}
              className="cursor-pointer"
            >
              Be the first to review
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {reviews.map((review) => (
          <ChannelReviewCard
            key={review.id}
            channelId={channelId}
            review={review}
            onEdit={handleEditReview}
          />
        ))}
      </div>
    );
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-4 pt-6">
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
    <section className="py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          Reviews {pagination?.total ? `(${pagination.total})` : ""}
        </h2>
        <div className="flex items-center gap-3">
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
          {isSignedIn && (
            <Button onClick={handleWriteReview} className="cursor-pointer">
              {viewerState?.hasReview ? "Edit your review" : "Write a Review"}
            </Button>
          )}
        </div>
      </div>

      {renderReviews()}
      {renderPagination()}

      <ChannelReviewFormSheet
        channelId={channelId}
        channelTitle={channelTitle}
        channelThumbnail={channelThumbnail}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        initialReview={editingReview}
      />
    </section>
  );
}
