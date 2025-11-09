import { useQuery } from "@tanstack/react-query";
import { TMDBMovie, TMDBSeries, TMDBVideo, TMDBTVSeason, TMDBTVSeasonDetails } from "@/lib/tmdb";

interface MovieDetails extends TMDBMovie {
  genres: Array<{ id: number; name: string }>;
  runtime: number;
  budget: number;
  revenue: number;
  production_companies?: Array<{ id: number; name: string; logo_path: string | null }>;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  spoken_languages?: Array<{ english_name: string; iso_639_1: string; name: string }>;
  release_date: string;
  imdb_id?: string;
}

interface TVDetails extends TMDBSeries {
  genres: Array<{ id: number; name: string }>;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  production_companies?: Array<{ id: number; name: string; logo_path: string | null }>;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  spoken_languages?: Array<{ english_name: string; iso_639_1: string; name: string }>;
  first_air_date: string;
  last_air_date?: string;
  status?: string;
  created_by?: Array<{ id: number; name: string; profile_path: string | null }>;
}

/**
 * Hook to fetch movie details
 */
export function useMovieDetails(movieId: number | null) {
  return useQuery({
    queryKey: ["movie", movieId, "details"],
    queryFn: async () => {
      if (!movieId) return null;
      const response = await fetch(`/api/movies/${movieId}`);
      if (!response.ok) throw new Error("Failed to fetch movie details");
      return response.json() as Promise<MovieDetails>;
    },
    enabled: !!movieId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch TV show details
 */
export function useTVDetails(tvId: number | null) {
  return useQuery({
    queryKey: ["tv", tvId, "details"],
    queryFn: async () => {
      if (!tvId) return null;
      const response = await fetch(`/api/tv/${tvId}`);
      if (!response.ok) throw new Error("Failed to fetch TV details");
      return response.json() as Promise<TVDetails>;
    },
    enabled: !!tvId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch content videos (trailers)
 */
export function useContentVideos(type: "movie" | "tv", id: number | null) {
  return useQuery({
    queryKey: [type, id, "videos"],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/${type}/${id}/videos`);
      if (!response.ok) throw new Error("Failed to fetch videos");
      const data = await response.json();
      return data as { id: number; results: TMDBVideo[] };
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch TV show seasons list
 */
export function useTVSeasons(tvId: number | null) {
  return useQuery({
    queryKey: ["tv", tvId, "seasons"],
    queryFn: async () => {
      if (!tvId) return null;
      const response = await fetch(`/api/tv/${tvId}/seasons`);
      if (!response.ok) throw new Error("Failed to fetch seasons");
      const data = await response.json();
      return data as { id: number; seasons: TMDBTVSeason[] };
    },
    enabled: !!tvId,
    staleTime: 10 * 60 * 1000, // 10 minutes (seasons don't change often)
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to fetch TV show season details with episodes
 */
export function useTVSeasonDetails(tvId: number | null, seasonNumber: number | null) {
  return useQuery({
    queryKey: ["tv", tvId, "season", seasonNumber],
    queryFn: async () => {
      if (!tvId || seasonNumber === null) return null;
      const response = await fetch(`/api/tv/${tvId}/seasons/${seasonNumber}`);
      if (!response.ok) throw new Error("Failed to fetch season details");
      return response.json() as Promise<TMDBTVSeasonDetails>;
    },
    enabled: !!tvId && seasonNumber !== null,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

