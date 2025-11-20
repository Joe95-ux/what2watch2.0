import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";

export interface Review {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  tmdbId: number;
  mediaType: "movie" | "tv";
  rating: number;
  title: string | null;
  content: string;
  helpful: number;
  isFeatured: boolean;
  reactionCounts: Record<string, number>;
  totalReactions: number;
  userReactions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CreateReviewData {
  tmdbId: number;
  mediaType: "movie" | "tv";
  rating: number;
  title?: string;
  content: string;
}

interface UpdateReviewData {
  rating?: number;
  title?: string;
  content?: string;
}

export function useReviews(
  tmdbId: number | null,
  mediaType: "movie" | "tv" | null,
  options?: {
    rating?: number | null;
    sortBy?: string;
    page?: number;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: ["reviews", tmdbId, mediaType, options],
    queryFn: async () => {
      if (!tmdbId || !mediaType) return null;

      const params = new URLSearchParams({
        tmdbId: tmdbId.toString(),
        mediaType,
        ...(options?.rating && { rating: options.rating.toString() }),
        ...(options?.sortBy && { sortBy: options.sortBy }),
        ...(options?.page && { page: options.page.toString() }),
        ...(options?.limit && { limit: options.limit.toString() }),
      });

      const response = await fetch(`/api/reviews?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to fetch reviews" }));
        throw new Error(error.error || "Failed to fetch reviews");
      }
      const data = await response.json();
      return data as ReviewsResponse;
    },
    enabled: !!tmdbId && !!mediaType,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (data: CreateReviewData) => {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create review");
      }

      return response.json() as Promise<Review>;
    },
    onSuccess: (_, variables) => {
      // Invalidate all review queries for this content (regardless of options)
      // This will automatically trigger a refetch for active queries
      queryClient.invalidateQueries({
        queryKey: ["reviews", variables.tmdbId, variables.mediaType],
        exact: false,
      });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      data,
    }: {
      reviewId: string;
      data: UpdateReviewData;
    }) => {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update review");
      }

      return response.json() as Promise<Review>;
    },
    onSuccess: (review) => {
      queryClient.invalidateQueries({
        queryKey: ["reviews", review.tmdbId, review.mediaType],
      });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete review");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}

export function useToggleReviewReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      reactionType,
    }: {
      reviewId: string;
      reactionType: string;
    }) => {
      const response = await fetch(`/api/reviews/${reviewId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reactionType }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to toggle reaction");
      }

      return response.json() as Promise<{ added: boolean }>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}

