import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ChannelReviewUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface ChannelReview {
  id: string;
  channelId: string;
  userId: string;
  rating: number;
  title: string | null;
  content: string;
  tags: string[];
  summaryTags?: string[];
  helpfulCount: number;
  notHelpfulCount?: number;
  isEdited: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: ChannelReviewUser;
  viewerHasVoted?: boolean;
  viewerVoteType?: "UP" | "DOWN" | null;
  canEdit?: boolean;
}

export interface ChannelReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
  tags: Array<{ tag: string; count: number }>;
}

export interface ChannelReviewViewerState {
  userId: string | null;
  hasReview: boolean;
  reviewId: string | null;
  reviewDraft: {
    id: string;
    rating: number;
    title: string | null;
    content: string;
    tags: string[];
  } | null;
  canReview: boolean;
}

export interface ChannelReviewsResponse {
  reviews: ChannelReview[];
  stats: ChannelReviewStats;
  viewerState: ChannelReviewViewerState;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ChannelReviewQueryOptions {
  rating?: number | null;
  sort?: string | null;
  tag?: string | null;
  page?: number;
  limit?: number;
}

interface CreateChannelReviewInput {
  rating: number;
  title?: string | null;
  content: string;
  tags?: string[];
}

type UpdateChannelReviewInput = Partial<CreateChannelReviewInput>;

export function useChannelReviews(channelId: string | null, options?: ChannelReviewQueryOptions) {
  return useQuery({
    queryKey: ["channel-reviews", channelId, options],
    queryFn: async () => {
      if (!channelId) {
        console.log("[useChannelReviews] No channelId provided");
        return null;
      }

      console.log("[useChannelReviews] Fetching reviews for channelId:", channelId, "options:", options);

      const params = new URLSearchParams({
        channelId,
      });

      if (options?.rating) {
        params.set("rating", options.rating.toString());
      }

      if (options?.sort) {
        params.set("sort", options.sort);
      }

      if (options?.tag) {
        params.set("tag", options.tag);
      }

      if (options?.page) {
        params.set("page", options.page.toString());
      }

      if (options?.limit) {
        params.set("limit", options.limit.toString());
      }

      const url = `/api/youtube/channel-reviews?${params.toString()}`;
      console.log("[useChannelReviews] Fetching from URL:", url);

      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to fetch reviews" }));
        console.error("[useChannelReviews] Error response:", error);
        throw new Error(error.error || "Failed to fetch reviews");
      }

      const data = (await response.json()) as ChannelReviewsResponse;
      console.log("[useChannelReviews] Response received:", {
        reviewsCount: data.reviews.length,
        totalReviews: data.pagination.total,
        pagination: data.pagination,
        viewerState: data.viewerState,
      });

      return data;
    },
    enabled: Boolean(channelId),
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useCreateChannelReview(channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateChannelReviewInput) => {
      const response = await fetch("/api/youtube/channel-reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, channelId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to create review" }));
        throw new Error(error.error || "Failed to create review");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["channel-reviews", channelId],
        exact: false,
      });
    },
  });
}

export function useUpdateChannelReview(channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, data }: { reviewId: string; data: UpdateChannelReviewInput }) => {
      const response = await fetch(`/api/youtube/channel-reviews/${reviewId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to update review" }));
        throw new Error(error.error || "Failed to update review");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["channel-reviews", channelId],
        exact: false,
      });
    },
  });
}

export function useDeleteChannelReview(channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const response = await fetch(`/api/youtube/channel-reviews/${reviewId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to delete review" }));
        throw new Error(error.error || "Failed to delete review");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["channel-reviews", channelId],
        exact: false,
      });
    },
  });
}

export function useToggleChannelReviewVote(channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, voteType }: { reviewId: string; voteType: "UP" | "DOWN" }) => {
      const response = await fetch(`/api/youtube/channel-reviews/${reviewId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to update vote" }));
        const errorWithCode = { ...error, code: error.code || "UNKNOWN_ERROR" };
        throw errorWithCode;
      }

      return response.json() as Promise<{ added: boolean; voteType: "UP" | "DOWN" | null }>;
    },
    onMutate: async ({ reviewId, voteType }: { reviewId: string; voteType: "UP" | "DOWN" }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["channel-reviews", channelId] });
      await queryClient.cancelQueries({ queryKey: ["youtube-review-detail", reviewId] });

      // Snapshot previous values
      const previousReviews = queryClient.getQueryData<{
        reviews: ChannelReview[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
        stats: ChannelReviewStats;
        viewerState: ChannelReviewViewerState;
      }>(["channel-reviews", channelId]);

      const previousReviewDetail = queryClient.getQueryData<{
        review: ChannelReview;
      }>(["youtube-review-detail", reviewId]);

      // Optimistically update reviews list
      if (previousReviews) {
        queryClient.setQueryData<typeof previousReviews>(
          ["channel-reviews", channelId],
          {
            ...previousReviews,
            reviews: previousReviews.reviews.map((r) => {
              if (r.id === reviewId) {
                const currentVoteType = r.viewerVoteType;
                const isUpVote = voteType === "UP";
                const isDownVote = voteType === "DOWN";
                const wasUpVoted = currentVoteType === "UP";
                const wasDownVoted = currentVoteType === "DOWN";
                
                // Toggle logic: if clicking same vote type, remove vote; otherwise switch
                let newVoteType: "UP" | "DOWN" | null = null;
                let newHelpfulCount = r.helpfulCount;
                let newNotHelpfulCount = r.notHelpfulCount ?? 0;
                
                if (isUpVote && wasUpVoted) {
                  // Remove up vote
                  newHelpfulCount = Math.max(0, r.helpfulCount - 1);
                } else if (isDownVote && wasDownVoted) {
                  // Remove down vote
                  newNotHelpfulCount = Math.max(0, (r.notHelpfulCount ?? 0) - 1);
                } else if (isUpVote) {
                  // Add/switch to up vote
                  newVoteType = "UP";
                  newHelpfulCount = wasDownVoted ? r.helpfulCount + 1 : r.helpfulCount + 1;
                  newNotHelpfulCount = wasDownVoted ? Math.max(0, (r.notHelpfulCount ?? 0) - 1) : (r.notHelpfulCount ?? 0);
                } else if (isDownVote) {
                  // Add/switch to down vote
                  newVoteType = "DOWN";
                  newHelpfulCount = wasUpVoted ? Math.max(0, r.helpfulCount - 1) : r.helpfulCount;
                  newNotHelpfulCount = wasUpVoted ? (r.notHelpfulCount ?? 0) + 1 : (r.notHelpfulCount ?? 0) + 1;
                }
                
                return {
                  ...r,
                  viewerHasVoted: !!newVoteType,
                  viewerVoteType: newVoteType,
                  helpfulCount: newHelpfulCount,
                  notHelpfulCount: newNotHelpfulCount,
                };
              }
              return r;
            }),
          }
        );
      }

      // Optimistically update review detail
      if (previousReviewDetail) {
        const currentVoteType = previousReviewDetail.review.viewerVoteType;
        const isUpVote = voteType === "UP";
        const isDownVote = voteType === "DOWN";
        const wasUpVoted = currentVoteType === "UP";
        const wasDownVoted = currentVoteType === "DOWN";
        
        let newVoteType: "UP" | "DOWN" | null = null;
        let newHelpfulCount = previousReviewDetail.review.helpfulCount;
        let newNotHelpfulCount = previousReviewDetail.review.notHelpfulCount ?? 0;
        
        if (isUpVote && wasUpVoted) {
          newHelpfulCount = Math.max(0, previousReviewDetail.review.helpfulCount - 1);
        } else if (isDownVote && wasDownVoted) {
          newNotHelpfulCount = Math.max(0, (previousReviewDetail.review.notHelpfulCount ?? 0) - 1);
        } else if (isUpVote) {
          newVoteType = "UP";
          newHelpfulCount = wasDownVoted ? previousReviewDetail.review.helpfulCount + 1 : previousReviewDetail.review.helpfulCount + 1;
          newNotHelpfulCount = wasDownVoted ? Math.max(0, (previousReviewDetail.review.notHelpfulCount ?? 0) - 1) : (previousReviewDetail.review.notHelpfulCount ?? 0);
        } else if (isDownVote) {
          newVoteType = "DOWN";
          newHelpfulCount = wasUpVoted ? Math.max(0, previousReviewDetail.review.helpfulCount - 1) : previousReviewDetail.review.helpfulCount;
          newNotHelpfulCount = wasUpVoted ? (previousReviewDetail.review.notHelpfulCount ?? 0) + 1 : (previousReviewDetail.review.notHelpfulCount ?? 0) + 1;
        }
        
        queryClient.setQueryData<typeof previousReviewDetail>(
          ["youtube-review-detail", reviewId],
          {
            ...previousReviewDetail,
            review: {
              ...previousReviewDetail.review,
              viewerHasVoted: !!newVoteType,
              viewerVoteType: newVoteType,
              helpfulCount: newHelpfulCount,
              notHelpfulCount: newNotHelpfulCount,
            },
          }
        );
      }

      return { previousReviews, previousReviewDetail };
    },
    onError: (error: { error?: string; code?: string }, _variables, context) => {
      // Rollback on error
      if (context?.previousReviews) {
        queryClient.setQueryData(["channel-reviews", channelId], context.previousReviews);
      }
      if (context?.previousReviewDetail) {
        queryClient.setQueryData(
          ["youtube-review-detail", _variables.reviewId],
          context.previousReviewDetail
        );
      }
      // Re-throw to be handled by component
      throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["channel-reviews", channelId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["youtube-review-detail"],
        exact: false,
      });
    },
  });
}


