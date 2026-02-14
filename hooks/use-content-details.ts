import { useQuery } from "@tanstack/react-query";
import {
  TMDBMovie,
  TMDBSeries,
  TMDBVideo,
  TMDBTVSeason,
  TMDBTVSeasonDetails,
  TMDBWatchProvidersResponse,
} from "@/lib/tmdb";
import { JustWatchAvailabilityResponse, JustWatchOffer, JustWatchCountry } from "@/lib/justwatch";

export function useJustWatchCountries() {
  return useQuery({
    queryKey: ["justwatch-countries"],
    queryFn: async () => {
      const res = await fetch("/api/justwatch/countries");
      if (!res.ok) return [];
      const data = (await res.json()) as JustWatchCountry[];
      return data;
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}

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
  tagline?: string;
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
  imdb_id?: string;
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
export function useContentVideos(type: "movie" | "tv", id: number | null, enabled: boolean = true) {
  return useQuery({
    queryKey: [type, id, "videos"],
    queryFn: async () => {
      if (!id) return null;
      // Use plural form for movies API route
      const apiType = type === "movie" ? "movies" : type;
      const response = await fetch(`/api/${apiType}/${id}/videos`);
      if (!response.ok) {
        // Return empty results instead of throwing to prevent errors
        return { id, results: [] };
      }
      const data = await response.json();
      return data as { id: number; results: TMDBVideo[] };
    },
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - videos don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 1, // Only retry once to avoid excessive API calls
    retryDelay: 1000, // 1 second delay between retries
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

/**
 * Hook to fetch similar movies
 */
export function useSimilarMovies(movieId: number | null) {
  return useQuery({
    queryKey: ["movie", movieId, "similar"],
    queryFn: async () => {
      if (!movieId) return null;
      const response = await fetch(`/api/movies/${movieId}/similar`);
      if (!response.ok) return { results: [], page: 1, total_pages: 0, total_results: 0 };
      return response.json() as Promise<{ results: TMDBMovie[]; page: number; total_pages: number; total_results: number }>;
    },
    enabled: !!movieId,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Hook to fetch recommended movies
 */
export function useRecommendedMovies(movieId: number | null) {
  return useQuery({
    queryKey: ["movie", movieId, "recommendations"],
    queryFn: async () => {
      if (!movieId) return null;
      const response = await fetch(`/api/movies/${movieId}/recommendations`);
      if (!response.ok) return { results: [], page: 1, total_pages: 0, total_results: 0 };
      return response.json() as Promise<{ results: TMDBMovie[]; page: number; total_pages: number; total_results: number }>;
    },
    enabled: !!movieId,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Hook to fetch similar TV shows
 */
export function useSimilarTV(tvId: number | null) {
  return useQuery({
    queryKey: ["tv", tvId, "similar"],
    queryFn: async () => {
      if (!tvId) return null;
      const response = await fetch(`/api/tv/${tvId}/similar`);
      if (!response.ok) return { results: [], page: 1, total_pages: 0, total_results: 0 };
      return response.json() as Promise<{ results: TMDBSeries[]; page: number; total_pages: number; total_results: number }>;
    },
    enabled: !!tvId,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Hook to fetch recommended TV shows
 */
export function useRecommendedTV(tvId: number | null) {
  return useQuery({
    queryKey: ["tv", tvId, "recommendations"],
    queryFn: async () => {
      if (!tvId) return null;
      const response = await fetch(`/api/tv/${tvId}/recommendations`);
      if (!response.ok) return { results: [], page: 1, total_pages: 0, total_results: 0 };
      return response.json() as Promise<{ results: TMDBSeries[]; page: number; total_pages: number; total_results: number }>;
    },
    enabled: !!tvId,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Hook to fetch watch providers
 */
export function useWatchProviders(type: "movie" | "tv", id: number | null, countryCode: string = "US") {
  return useQuery({
    queryKey: [type, id, "watch-providers", countryCode.toUpperCase()],
    queryFn: async () => {
      if (!id) return null;
      const country = countryCode.toUpperCase();

      const jwResponse = await fetch(`/api/justwatch/${type}/${id}?country=${country}`);
      if (jwResponse.ok) {
        const data = (await jwResponse.json()) as JustWatchAvailabilityResponse | null;
        if (data && hasOffers(data)) {
          return data;
        }
      }

      const fallback = await fetchTmdbProviders(type, id, country);
      return fallback;
    },
    enabled: !!id,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Hook to fetch Where to Watch for a specific TV season.
 */
export function useSeasonWatchProviders(
  showTmdbId: number | null,
  seasonNumber: number | null,
  countryCode: string = "US"
) {
  return useQuery({
    queryKey: ["tv", showTmdbId, "season", seasonNumber, "watch-providers", countryCode.toUpperCase()],
    queryFn: async () => {
      if (showTmdbId == null || seasonNumber == null) return null;
      const country = countryCode.toUpperCase();
      const res = await fetch(
        `/api/justwatch/tv/${showTmdbId}/season/${seasonNumber}?country=${country}`
      );
      if (!res.ok) return null;
      const data = (await res.json()) as JustWatchAvailabilityResponse | null;
      return data && data.allOffers?.length > 0 ? data : null;
    },
    enabled: showTmdbId != null && seasonNumber != null && seasonNumber >= 0,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: 1,
  });
}

async function fetchTmdbProviders(
  type: "movie" | "tv",
  id: number,
  country: string
): Promise<JustWatchAvailabilityResponse | null> {
  const apiType = type === "movie" ? "movies" : type;
  const response = await fetch(`/api/${apiType}/${id}/watch-providers`);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as TMDBWatchProvidersResponse;
  const region =
    data.results?.[country] ||
    data.results?.[Object.keys(data.results || {})[0] as keyof typeof data.results];
  if (!region) return null;

  const grouped: Record<string, JustWatchOffer[]> = {
    flatrate: mapTmdbProvider(region.flatrate, "flatrate"),
    buy: mapTmdbProvider(region.buy, "buy"),
    rent: mapTmdbProvider(region.rent, "rent"),
    ads: [],
    free: [],
    cinema: [],
    other: [],
  };

  const allOffers = Object.values(grouped).flat();
  if (!allOffers.length) return null;

  return {
    country,
    lastSyncedAt: null,
    offersByType: grouped as JustWatchAvailabilityResponse["offersByType"],
    allOffers,
    credits: {
      text: "Data powered by TMDB",
      logoUrl: "https://image.tmdb.org/t/p/original//43uA9t8ufehhlGq4iVFaLjSlIc3.png",
      url: "https://www.themoviedb.org",
    },
  };
}

function mapTmdbProvider(
  providers: Array<{ provider_id: number; provider_name: string; logo_path: string | null }> | undefined,
  monetizationType: JustWatchOffer["monetizationType"]
): JustWatchOffer[] {
  if (!providers) return [];
  return providers.map((provider) => ({
    providerId: provider.provider_id,
    providerName: provider.provider_name,
    iconUrl: provider.logo_path ? `https://image.tmdb.org/t/p/original${provider.logo_path}` : null,
    monetizationType,
    retailPrice: null,
    currency: null,
    presentationType: null,
    standardWebUrl: null,
    deepLinkUrl: null,
  }));
}

function hasOffers(data: JustWatchAvailabilityResponse) {
  if (!data) return false;
  return data.allOffers && data.allOffers.length > 0;
}

/**
 * Hook to fetch IMDb rating (with TMDB fallback)
 */
export function useIMDBRating(imdbId: string | null | undefined, tmdbRating: number | null) {
  return useQuery({
    queryKey: ["imdb-rating", imdbId, tmdbRating],
    queryFn: async () => {
      if (!imdbId) {
        // Fallback to TMDB rating if no IMDb ID
        if (tmdbRating && tmdbRating > 0) {
          return { rating: tmdbRating, source: "tmdb" as const };
        }
        return null;
      }

      const params = new URLSearchParams({
        imdbId,
        ...(tmdbRating && tmdbRating > 0 && { tmdbRating: tmdbRating.toString() }),
      });

      const response = await fetch(`/api/imdb-rating?${params.toString()}`);
      if (!response.ok) {
        // Fallback to TMDB rating on error
        if (tmdbRating && tmdbRating > 0) {
          return { rating: tmdbRating, source: "tmdb" as const };
        }
        return null;
      }

      const data = await response.json();
      return data as { rating: number; votes?: number; source: "imdb" | "tmdb" };
    },
    enabled: !!imdbId || (!!tmdbRating && tmdbRating > 0),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (IMDb ratings don't change often)
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    retry: 1,
  });
}

/**
 * Hook to fetch full OMDB data (ratings, awards, box office, etc.)
 */
export function useOMDBData(imdbId: string | null | undefined) {
  return useQuery({
    queryKey: ["omdb-data", imdbId],
    queryFn: async () => {
      if (!imdbId) return null;

      const response = await fetch(`/api/omdb?imdbId=${imdbId}`);
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data as {
        imdbRating: number | null;
        imdbVotes: number | null;
        metascore: number | null;
        rottenTomatoes: {
          critic?: number | null;
          audience?: number | null;
        } | null;
        awards: string | null;
        rated: string | null;
        boxOffice: string | null;
        production: string | null;
        dvd: string | null;
        website: string | null;
      };
    },
    enabled: !!imdbId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    retry: 1,
  });
}

