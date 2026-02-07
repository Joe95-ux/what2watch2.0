import { useQuery } from "@tanstack/react-query";
import { TMDBMovie, TMDBSeries, TMDBResponse } from "@/lib/tmdb";

interface SearchParams {
  query?: string;
  type?: "all" | "movie" | "tv";
  genre?: number | number[]; // Changed to support array
  year?: string;
  minRating?: number;
  sortBy?: string;
  page?: number;
  runtimeMin?: number;
  runtimeMax?: number;
  withOriginCountry?: string;
  watchProvider?: number;
  watchRegion?: string;
}

export function useSearch(params: SearchParams) {
  return useQuery({
    queryKey: ["search", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.query) searchParams.set("query", params.query);
      if (params.type && params.type !== "all") searchParams.set("type", params.type);
      // Handle genre as array or single number
      if (params.genre) {
        if (Array.isArray(params.genre)) {
          if (params.genre.length > 0) {
            searchParams.set("genre", params.genre.join(","));
          }
        } else {
          searchParams.set("genre", params.genre.toString());
        }
      }
      if (params.year) searchParams.set("year", params.year);
      if (params.minRating) searchParams.set("minRating", params.minRating.toString());
      if (params.sortBy) searchParams.set("sortBy", params.sortBy);
      if (params.runtimeMin !== undefined) searchParams.set("runtimeMin", params.runtimeMin.toString());
      if (params.runtimeMax !== undefined) searchParams.set("runtimeMax", params.runtimeMax.toString());
      if (params.withOriginCountry) searchParams.set("withOriginCountry", params.withOriginCountry);
      if (params.watchProvider !== undefined) searchParams.set("watchProvider", params.watchProvider.toString());
      if (params.watchRegion) searchParams.set("watchRegion", params.watchRegion);
      // Always include page, default to 1
      searchParams.set("page", (params.page || 1).toString());

      const response = await fetch(`/api/search?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch search results");
      }
      return response.json() as Promise<TMDBResponse<TMDBMovie | TMDBSeries>>;
    },
    enabled: !!(params.query || params.genre || params.year || (params.minRating && params.minRating > 0) || params.runtimeMin !== undefined || params.runtimeMax !== undefined || params.withOriginCountry || params.watchProvider !== undefined || params.sortBy),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

