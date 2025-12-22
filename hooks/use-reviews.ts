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
  containsSpoilers: boolean;
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
  containsSpoilers?: boolean;
}

interface UpdateReviewData {
  rating?: number;
  title?: string;
  content?: string;
  containsSpoilers?: boolean;
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
        exact: false,
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
    onSuccess: (_, reviewId) => {
      // Invalidate all review queries to ensure the deleted review is removed
      queryClient.invalidateQueries({ queryKey: ["reviews"], exact: false });
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

/**
 * TMDB Review interfaces and hook
 */
export interface TMDBReview {
  author: string;
  author_details: {
    name: string;
    username: string;
    avatar_path: string | null;
    rating: number | null;
  };
  content: string;
  created_at: string;
  id: string;
  updated_at: string;
  url: string;
}

export interface TMDBReviewsResponse {
  id: number;
  page: number;
  results: TMDBReview[];
  total_pages: number;
  total_results: number;
}

export function useTMDBReviews(
  tmdbId: number | null,
  mediaType: "movie" | "tv" | null,
  page: number = 1
) {
  return useQuery({
    queryKey: ["tmdb-reviews", tmdbId, mediaType, page],
    queryFn: async () => {
      if (!tmdbId || !mediaType) return null;

      const params = new URLSearchParams({
        tmdbId: tmdbId.toString(),
        mediaType,
        page: page.toString(),
      });

      const response = await fetch(`/api/reviews/tmdb?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to fetch TMDB reviews" }));
        throw new Error(error.error || "Failed to fetch TMDB reviews");
      }
      const data = await response.json();
      return data as TMDBReviewsResponse;
    },
    enabled: !!tmdbId && !!mediaType,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useUserReviews(
  userId: string | null,
  options?: {
    page?: number;
    limit?: number;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: ["user-reviews", userId, options],
    queryFn: async () => {
      if (!userId) return null;

      const params = new URLSearchParams({
        ...(options?.page && { page: options.page.toString() }),
        ...(options?.limit && { limit: options.limit.toString() }),
      });

      const response = await fetch(`/api/reviews/user/${userId}?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to fetch user reviews" }));
        throw new Error(error.error || "Failed to fetch user reviews");
      }
      const data = await response.json();
      return data as ReviewsResponse;
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!userId,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

