"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChannelReviewCard } from "./channel-review-card";
import { ChannelReviewFormSheet } from "./channel-review-form-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { ChannelReview } from "@/hooks/use-youtube-channel-reviews";
import { useYouTubeChannelLists, type YouTubeChannelList } from "@/hooks/use-youtube-channel-lists";
import { ChannelListBuilder } from "./channel-lists/channel-list-builder";
import { useClerk, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import Image from "next/image";

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
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const [page, setPage] = useState(1);
  const [editingReview, setEditingReview] = useState<RecentReview | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isCreateListSheetOpen, setIsCreateListSheetOpen] = useState(false);

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
  const {
    data: sidebarLists = [],
    isLoading: isLoadingSidebarLists,
  } = useYouTubeChannelLists("public");
  const topEightLists = sidebarLists.slice(0, 8);

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

  const handleCreateListClick = () => {
    if (!isSignedIn) {
      toast.info("Sign in to create channel lists.");
      openSignIn?.({
        afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
      });
      return;
    }
    setIsCreateListSheetOpen(true);
  };

  const handleCloseCreateListSheet = () => {
    setIsCreateListSheetOpen(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
      <div className="lg:col-span-8 space-y-6">
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
                  className="cursor-pointer"
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
                  className="cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <aside className="lg:col-span-4 space-y-3 lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Channel Lists</h3>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-sm cursor-pointer"
            onClick={() => router.push("/youtube?tab=lists")}
          >
            View all
          </Button>
        </div>
        {isLoadingSidebarLists ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <CompactChannelListCardSkeleton key={`channel-list-skeleton-${i}`} />
            ))}
          </div>
        ) : topEightLists.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4">
            No channel lists yet.
          </div>
        ) : (
          <div className="space-y-2">
            {topEightLists.slice(0, 4).map((list) => (
              <CompactChannelListCard key={list.id} list={list} />
            ))}
            <Button
              type="button"
              variant="ghost"
              className="w-fit rounded-[20px] border-0 bg-transparent hover:bg-muted/60 cursor-pointer"
              onClick={handleCreateListClick}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create List
            </Button>
            {topEightLists.slice(4, 8).map((list) => (
              <CompactChannelListCard key={list.id} list={list} />
            ))}
          </div>
        )}
      </aside>

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

      <ChannelListBuilder
        isOpen={isCreateListSheetOpen}
        onClose={handleCloseCreateListSheet}
        onCompleted={() => {
          queryClient.invalidateQueries({ queryKey: ["youtube-channel-lists"] });
          setIsCreateListSheetOpen(false);
        }}
      />
    </div>
  );
}

function CompactChannelListCardSkeleton() {
  return (
    <div className="relative flex rounded-lg border border-border overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col p-3 gap-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
      <div className="w-16 sm:w-20 aspect-[3/4] flex-shrink-0">
        <Skeleton className="h-full w-full rounded-r-lg" />
      </div>
    </div>
  );
}

function CompactChannelListCard({ list }: { list: YouTubeChannelList }) {
  const router = useRouter();
  const posterLikeImage = list.items?.[0]?.channelThumbnail ?? null;
  const itemCount = list._count?.items ?? list.items?.length ?? 0;
  const updatedAt = list.updatedAt
    ? new Date(list.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div
      className="relative flex rounded-lg border border-border transition-all group cursor-pointer overflow-hidden"
      onClick={() => router.push(`/youtube-channel/lists/${list.id}`)}
    >
      <div className="flex-1 min-w-0 flex flex-col p-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/youtube-channel/lists/${list.id}`);
          }}
          className="text-left text-sm font-semibold line-clamp-1 hover:text-primary transition-colors cursor-pointer"
        >
          {list.name}
        </button>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {updatedAt ? `Updated ${updatedAt}` : "Recently updated"} . {itemCount} {itemCount === 1 ? "channel" : "channels"}
        </p>
      </div>

      {posterLikeImage ? (
        <div className="relative w-16 sm:w-20 aspect-[3/4] rounded-r-lg overflow-hidden flex-shrink-0 bg-muted">
          <Image
            src={posterLikeImage}
            alt={list.name}
            fill
            className="object-cover"
            sizes="80px"
            unoptimized
          />
        </div>
      ) : (
        <div className="w-16 sm:w-20 aspect-[3/4] rounded-r-lg bg-muted flex-shrink-0 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">No Image</span>
        </div>
      )}
    </div>
  );
}

