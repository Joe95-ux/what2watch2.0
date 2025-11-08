/**
 * TheMovieDB API utilities
 * Documentation: https://developer.themoviedb.org/docs
 */

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
  adult: boolean;
  original_language: string;
  original_title: string;
}

export interface TMDBSeries {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
  original_language: string;
  original_name: string;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/**
 * Get TMDB API headers with authentication
 */
function getHeaders(): Record<string, string> {
  const accessToken = process.env.MOVIEDB_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('MOVIEDB_ACCESS_TOKEN is not set');
  }
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Fetch from TMDB API
 */
async function fetchTMDB<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  const response = await fetch(url.toString(), {
    headers: getHeaders(),
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get image URL for TMDB images
 */
export function getImageUrl(path: string | null, size: 'w200' | 'w300' | 'w500' | 'w780' | 'w1280' | 'original' = 'w500'): string {
  if (!path) return '/placeholder-poster.jpg';
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * Get poster URL
 */
export function getPosterUrl(path: string | null, size: 'w200' | 'w300' | 'w500' | 'w780' | 'original' = 'w500'): string {
  return getImageUrl(path, size);
}

/**
 * Get backdrop URL
 */
export function getBackdropUrl(path: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w1280'): string {
  return getImageUrl(path, size);
}

/**
 * Get movie genres
 */
export async function getMovieGenres(): Promise<TMDBGenre[]> {
  const data = await fetchTMDB<{ genres: TMDBGenre[] }>('/genre/movie/list');
  return data.genres;
}

/**
 * Get TV genres
 */
export async function getTVGenres(): Promise<TMDBGenre[]> {
  const data = await fetchTMDB<{ genres: TMDBGenre[] }>('/genre/tv/list');
  return data.genres;
}

/**
 * Get popular movies
 */
export async function getPopularMovies(page: number = 1): Promise<TMDBResponse<TMDBMovie>> {
  return fetchTMDB<TMDBResponse<TMDBMovie>>('/movie/popular', { page });
}

/**
 * Get top rated movies
 */
export async function getTopRatedMovies(page: number = 1): Promise<TMDBResponse<TMDBMovie>> {
  return fetchTMDB<TMDBResponse<TMDBMovie>>('/movie/top_rated', { page });
}

/**
 * Get now playing movies
 */
export async function getNowPlayingMovies(page: number = 1): Promise<TMDBResponse<TMDBMovie>> {
  return fetchTMDB<TMDBResponse<TMDBMovie>>('/movie/now_playing', { page });
}

/**
 * Get upcoming movies
 */
export async function getUpcomingMovies(page: number = 1): Promise<TMDBResponse<TMDBMovie>> {
  return fetchTMDB<TMDBResponse<TMDBMovie>>('/movie/upcoming', { page });
}

/**
 * Get popular TV shows
 */
export async function getPopularTV(page: number = 1): Promise<TMDBResponse<TMDBSeries>> {
  return fetchTMDB<TMDBResponse<TMDBSeries>>('/tv/popular', { page });
}

/**
 * Get top rated TV shows
 */
export async function getTopRatedTV(page: number = 1): Promise<TMDBResponse<TMDBSeries>> {
  return fetchTMDB<TMDBResponse<TMDBSeries>>('/tv/top_rated', { page });
}

/**
 * Get TV shows airing today
 */
export async function getTVAiringToday(page: number = 1): Promise<TMDBResponse<TMDBSeries>> {
  return fetchTMDB<TMDBResponse<TMDBSeries>>('/tv/airing_today', { page });
}

/**
 * Get TV shows on the air
 */
export async function getTVOnTheAir(page: number = 1): Promise<TMDBResponse<TMDBSeries>> {
  return fetchTMDB<TMDBResponse<TMDBSeries>>('/tv/on_the_air', { page });
}

/**
 * Search movies
 */
export async function searchMovies(query: string, page: number = 1): Promise<TMDBResponse<TMDBMovie>> {
  return fetchTMDB<TMDBResponse<TMDBMovie>>('/search/movie', { query, page });
}

/**
 * Search TV shows
 */
export async function searchTV(query: string, page: number = 1): Promise<TMDBResponse<TMDBSeries>> {
  return fetchTMDB<TMDBResponse<TMDBSeries>>('/search/tv', { query, page });
}

/**
 * Get movie details
 */
export async function getMovieDetails(movieId: number): Promise<TMDBMovie & { genres: TMDBGenre[]; runtime: number; budget: number; revenue: number }> {
  return fetchTMDB(`/movie/${movieId}`);
}

/**
 * Get TV show details
 */
export async function getTVDetails(tvId: number): Promise<TMDBSeries & { genres: TMDBGenre[]; number_of_seasons: number; number_of_episodes: number; episode_run_time: number[] }> {
  return fetchTMDB(`/tv/${tvId}`);
}

/**
 * Discover movies with filters
 */
export async function discoverMovies(filters: {
  page?: number;
  genre?: number;
  year?: number;
  sortBy?: string;
  minRating?: number;
  language?: string;
}): Promise<TMDBResponse<TMDBMovie>> {
  const params: Record<string, string | number> = {
    page: filters.page || 1,
  };
  
  if (filters.genre) params.with_genres = filters.genre;
  if (filters.year) params.primary_release_year = filters.year;
  if (filters.sortBy) params.sort_by = filters.sortBy;
  if (filters.minRating) params['vote_average.gte'] = filters.minRating;
  if (filters.language) params.with_original_language = filters.language;
  
  return fetchTMDB<TMDBResponse<TMDBMovie>>('/discover/movie', params);
}

/**
 * Discover TV shows with filters
 */
export async function discoverTV(filters: {
  page?: number;
  genre?: number;
  year?: number;
  sortBy?: string;
  minRating?: number;
  language?: string;
}): Promise<TMDBResponse<TMDBSeries>> {
  const params: Record<string, string | number> = {
    page: filters.page || 1,
  };
  
  if (filters.genre) params.with_genres = filters.genre;
  if (filters.year) params.first_air_date_year = filters.year;
  if (filters.sortBy) params.sort_by = filters.sortBy;
  if (filters.minRating) params['vote_average.gte'] = filters.minRating;
  if (filters.language) params.with_original_language = filters.language;
  
  return fetchTMDB<TMDBResponse<TMDBSeries>>('/discover/tv', params);
}

