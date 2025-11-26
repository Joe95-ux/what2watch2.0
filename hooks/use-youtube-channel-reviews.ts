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
  helpfulCount: number;
  isEdited: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: ChannelReviewUser;
  viewerHasVoted?: boolean;
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
      if (!channelId) return null;

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

      const response = await fetch(`/api/youtube/channel-reviews?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to fetch reviews" }));
        throw new Error(error.error || "Failed to fetch reviews");
      }

      return (await response.json()) as ChannelReviewsResponse;
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
    mutationFn: async (reviewId: string) => {
      const response = await fetch(`/api/youtube/channel-reviews/${reviewId}/vote`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to update vote" }));
        throw new Error(error.error || "Failed to update vote");
      }

      return response.json() as Promise<{ added: boolean }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["channel-reviews", channelId],
        exact: false,
      });
    },
  });
}


