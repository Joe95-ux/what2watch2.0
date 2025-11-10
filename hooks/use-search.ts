import { useQuery } from "@tanstack/react-query";
import { TMDBMovie, TMDBSeries, TMDBResponse } from "@/lib/tmdb";

interface SearchParams {
  query?: string;
  type?: "all" | "movie" | "tv";
  genre?: string;
  year?: string;
  minRating?: number;
  sortBy?: string;
  page?: number;
}

export function useSearch(params: SearchParams) {
  return useQuery({
    queryKey: ["search", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.query) searchParams.set("query", params.query);
      if (params.type && params.type !== "all") searchParams.set("type", params.type);
      if (params.genre) searchParams.set("genre", params.genre);
      if (params.year) searchParams.set("year", params.year);
      if (params.minRating) searchParams.set("minRating", params.minRating.toString());
      if (params.sortBy) searchParams.set("sortBy", params.sortBy);
      if (params.page) searchParams.set("page", params.page.toString());

      const response = await fetch(`/api/search?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch search results");
      }
      return response.json() as Promise<TMDBResponse<TMDBMovie | TMDBSeries>>;
    },
    enabled: !!(params.query || params.genre || params.year || (params.minRating && params.minRating > 0)),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

