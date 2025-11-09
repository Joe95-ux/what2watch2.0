import { useQuery } from "@tanstack/react-query";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

// Query keys
export const movieQueryKeys = {
  all: ["movies"] as const,
  popular: (page: number) => [...movieQueryKeys.all, "popular", page] as const,
  nowPlaying: (page: number) => [...movieQueryKeys.all, "now-playing", page] as const,
  personalized: (genreId: number) => [...movieQueryKeys.all, "personalized", genreId] as const,
  byGenre: (genreId: number, page: number) => [...movieQueryKeys.all, "genre", genreId, page] as const,
};

export const tvQueryKeys = {
  all: ["tv"] as const,
  popular: (page: number) => [...tvQueryKeys.all, "popular", page] as const,
  onTheAir: (page: number) => [...tvQueryKeys.all, "on-the-air", page] as const,
  byGenre: (genreId: number, page: number) => [...tvQueryKeys.all, "genre", genreId, page] as const,
};

// Fetch functions
const fetchPopularMovies = async (page: number = 1): Promise<TMDBMovie[]> => {
  const res = await fetch(`/api/movies/popular?page=${page}`);
  if (!res.ok) throw new Error("Failed to fetch popular movies");
  const data = await res.json();
  return data.results || [];
};

const fetchNowPlayingMovies = async (page: number = 1): Promise<TMDBMovie[]> => {
  const res = await fetch(`/api/movies/now-playing?page=${page}`);
  if (!res.ok) throw new Error("Failed to fetch now playing movies");
  const data = await res.json();
  return data.results || [];
};

const fetchPopularTV = async (page: number = 1): Promise<TMDBSeries[]> => {
  const res = await fetch(`/api/tv/popular?page=${page}`);
  if (!res.ok) throw new Error("Failed to fetch popular TV shows");
  const data = await res.json();
  return data.results || [];
};

const fetchOnTheAirTV = async (page: number = 1): Promise<TMDBSeries[]> => {
  const res = await fetch(`/api/tv/on-the-air?page=${page}`);
  if (!res.ok) throw new Error("Failed to fetch on the air TV shows");
  const data = await res.json();
  return data.results || [];
};

const fetchPersonalizedMovies = async (genreId: number): Promise<TMDBMovie[]> => {
  const res = await fetch(
    `/api/search?genre=${genreId}&type=movie&sortBy=popularity.desc&page=1`
  );
  if (!res.ok) throw new Error("Failed to fetch personalized movies");
  const data = await res.json();
  return data.results || [];
};

const fetchMoviesByGenre = async (genreId: number, page: number = 1): Promise<TMDBMovie[]> => {
  const res = await fetch(
    `/api/search?genre=${genreId}&type=movie&sortBy=popularity.desc&page=${page}`
  );
  if (!res.ok) throw new Error("Failed to fetch movies by genre");
  const data = await res.json();
  return data.results || [];
};

// Custom hooks
export function usePopularMovies(page: number = 1) {
  return useQuery({
    queryKey: movieQueryKeys.popular(page),
    queryFn: () => fetchPopularMovies(page),
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useNowPlayingMovies(page: number = 1) {
  return useQuery({
    queryKey: movieQueryKeys.nowPlaying(page),
    queryFn: () => fetchNowPlayingMovies(page),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function usePopularTV(page: number = 1) {
  return useQuery({
    queryKey: tvQueryKeys.popular(page),
    queryFn: () => fetchPopularTV(page),
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useOnTheAirTV(page: number = 1) {
  return useQuery({
    queryKey: tvQueryKeys.onTheAir(page),
    queryFn: () => fetchOnTheAirTV(page),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function usePersonalizedMovies(genreId: number | null) {
  return useQuery({
    queryKey: movieQueryKeys.personalized(genreId || 0),
    queryFn: () => fetchPersonalizedMovies(genreId!),
    enabled: genreId !== null && genreId > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useMoviesByGenre(genreId: number, page: number = 1) {
  return useQuery({
    queryKey: movieQueryKeys.byGenre(genreId, page),
    queryFn: () => fetchMoviesByGenre(genreId, page),
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

