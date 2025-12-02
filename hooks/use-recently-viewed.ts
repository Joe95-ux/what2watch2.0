"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

export interface RecentlyViewedItem {
  id: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  viewedAt: string;
}

interface RecentlyViewedResponse {
  items: RecentlyViewedItem[];
  hasMore: boolean;
  total: number;
}

// Fetch recently viewed items with infinite loading
export function useRecentlyViewed() {
  return useInfiniteQuery<RecentlyViewedResponse>({
    queryKey: ["recently-viewed"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(`/api/recently-viewed?page=${pageParam}&pageSize=20`);
      if (!response.ok) {
        throw new Error("Failed to fetch recently viewed");
      }
      return response.json();
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasMore) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Add a recently viewed item
export function useAddRecentlyViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: {
      tmdbId: number;
      mediaType: "movie" | "tv";
      title: string;
      posterPath?: string | null;
      backdropPath?: string | null;
      releaseDate?: string | null;
      firstAirDate?: string | null;
    }) => {
      const response = await fetch("/api/recently-viewed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });

      if (!response.ok) {
        throw new Error("Failed to add recently viewed");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch recently viewed
      queryClient.invalidateQueries({ queryKey: ["recently-viewed"] });
    },
  });
}

// Clear all recently viewed items
export function useClearRecentlyViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/recently-viewed", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to clear recently viewed");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch recently viewed
      queryClient.invalidateQueries({ queryKey: ["recently-viewed"] });
    },
  });
}

// Helper function to convert RecentlyViewedItem to TMDBMovie or TMDBSeries
export function recentlyViewedToTMDBItem(item: RecentlyViewedItem): TMDBMovie | TMDBSeries {
  if (item.mediaType === "movie") {
    return {
      id: item.tmdbId,
      title: item.title,
      poster_path: item.posterPath,
      backdrop_path: item.backdropPath,
      release_date: item.releaseDate || "",
      vote_average: 0,
      vote_count: 0,
      overview: "",
      genre_ids: [],
      popularity: 0,
      adult: false,
      original_language: "",
      original_title: item.title,
    };
  } else {
    return {
      id: item.tmdbId,
      name: item.title,
      poster_path: item.posterPath,
      backdrop_path: item.backdropPath,
      first_air_date: item.firstAirDate || "",
      vote_average: 0,
      vote_count: 0,
      overview: "",
      genre_ids: [],
      popularity: 0,
      original_language: "",
      original_name: item.title,
    };
  }
}

