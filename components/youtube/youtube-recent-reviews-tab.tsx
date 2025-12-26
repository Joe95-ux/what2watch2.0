"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChannelReviewCard } from "./channel-review-card";
import { ChannelReviewFormSheet } from "./channel-review-form-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ChannelReview } from "@/hooks/use-youtube-channel-reviews";

function ChannelReviewCardSkeleton() {
  return (
    <div className="relative">
      {/* Card Skeleton */}
      <div className="relative rounded-2xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur mb-2">
        <div className="space-y-3">
          {/* Rating Skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
          </div>
          {/* Title Skeleton */}
          <Skeleton className="h-5 w-3/4" />
          {/* Content Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          {/* Tags Skeleton */}
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          {/* Action buttons Skeleton */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
      {/* Username and Date Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-1" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

interface RecentReview extends ChannelReview {
  channelTitle: string | null;
  channelThumbnail: string | null;
  channelSlug: string | null;
}

export function YouTubeRecentReviewsTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editingReview, setEditingReview] = useState<RecentReview | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const { data, isLoading } = useQuery<{
    reviews: RecentReview[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["youtube-recent-reviews", page],
    queryFn: async () => {
      const response = await fetch(`/api/youtube/channel-reviews/recent?page=${page}&limit=12`);
      if (!response.ok) throw new Error("Failed to fetch recent reviews");
      return response.json();
    },
  });

  const reviews = data?.reviews ?? [];
  const pagination = data?.pagination;

  const handleReviewClick = (review: RecentReview) => {
    // Navigate to review detail page
    router.push(`/youtube/reviews/${review.id}`);
  };

  const handleEdit = (review: RecentReview) => {
    setEditingReview(review);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = () => {
    setIsEditSheetOpen(false);
    setEditingReview(null);
    // Invalidate queries to refresh the list
    queryClient.invalidateQueries({ queryKey: ["youtube-recent-reviews"] });
  };

  return (
    <div className="space-y-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <ChannelReviewCardSkeleton key={index} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">No reviews yet.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                onClick={(e) => {
                  // Don't navigate if clicking on buttons, dropdown menus, or interactive elements
                  const target = e.target as HTMLElement;
                  if (
                    target.closest("button") ||
                    target.closest('[role="button"]') ||
                    target.closest("a") ||
                    target.closest('[role="menuitem"]') ||
                    target.closest('[data-radix-popper-content-wrapper]')
                  ) {
                    return;
                  }
                  handleReviewClick(review);
                }}
                className="cursor-pointer"
              >
                <ChannelReviewCard
                  channelId={review.channelId}
                  review={review}
                  onEdit={handleEdit}
                  channelTitle={review.channelTitle}
                />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Edit Review Sheet */}
      {editingReview && (
        <ChannelReviewFormSheet
          channelId={editingReview.channelId}
          channelTitle={editingReview.channelTitle || "Channel"}
          channelThumbnail={editingReview.channelThumbnail}
          isOpen={isEditSheetOpen}
          onClose={handleCloseEditSheet}
          initialReview={{
            id: editingReview.id,
            channelId: editingReview.channelId,
            userId: editingReview.userId,
            rating: editingReview.rating,
            title: editingReview.title,
            content: editingReview.content,
            tags: editingReview.tags,
            summaryTags: editingReview.summaryTags,
            helpfulCount: editingReview.helpfulCount,
            notHelpfulCount: editingReview.notHelpfulCount,
            isEdited: editingReview.isEdited,
            status: editingReview.status,
            createdAt: editingReview.createdAt,
            updatedAt: editingReview.updatedAt,
            user: editingReview.user,
            canEdit: editingReview.canEdit,
          }}
        />
      )}
    </div>
  );
}

