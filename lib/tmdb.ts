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
 * Simple fetch from TMDB API with timeout
 */
async function fetchTMDB<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
  const accessToken = process.env.MOVIEDB_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('MOVIEDB_ACCESS_TOKEN is not set');
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 40000); // 40 second timeout (less than route-level 45s)

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText} (${response.status})`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Check for abort error or timeout-related errors
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        throw new Error('Request timeout: TMDB API took too long to respond');
      }
    }
    
    throw error;
  }
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
 * Get all genres (combines movie and TV genres)
 */
export async function getAllGenres(): Promise<TMDBGenre[]> {
  try {
    const [movieData, tvData] = await Promise.all([
      fetchTMDB<{ genres: TMDBGenre[] }>('/genre/movie/list'),
      fetchTMDB<{ genres: TMDBGenre[] }>('/genre/tv/list'),
    ]);

    // Combine and deduplicate
    const allGenres = new Map<number, TMDBGenre>();
    movieData.genres.forEach(genre => allGenres.set(genre.id, genre));
    tvData.genres.forEach(genre => allGenres.set(genre.id, genre));
    
    return Array.from(allGenres.values());
  } catch (error) {
    console.error('Failed to fetch genres:', error);
    throw error;
  }
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
 * Get trending movies
 */
export async function getTrendingMovies(
  timeWindow: "day" | "week" = "week",
  page: number = 1
): Promise<TMDBResponse<TMDBMovie>> {
  return fetchTMDB<TMDBResponse<TMDBMovie>>(
    `/trending/movie/${timeWindow}`,
    { page }
  );
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
 * Get trending TV shows
 */
export async function getTrendingTV(
  timeWindow: "day" | "week" = "week",
  page: number = 1
): Promise<TMDBResponse<TMDBSeries>> {
  return fetchTMDB<TMDBResponse<TMDBSeries>>(
    `/trending/tv/${timeWindow}`,
    { page }
  );
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
 * Search for people (actors, directors, etc.)
 */
export interface TMDBSearchPerson {
  id: number;
  name: string;
  known_for_department: string;
  profile_path: string | null;
  popularity: number;
}

export interface TMDBSearchPersonResponse {
  page: number;
  results: TMDBSearchPerson[];
  total_pages: number;
  total_results: number;
}

export async function searchPerson(query: string, page: number = 1): Promise<TMDBSearchPersonResponse> {
  return fetchTMDB<TMDBSearchPersonResponse>('/search/person', { query, page });
}

/**
 * Get person movie credits
 */
export interface TMDBPersonMovieCredit {
  id: number;
  title: string;
  character?: string;
  release_date: string;
  vote_average: number;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface TMDBPersonMovieCredits {
  cast: TMDBPersonMovieCredit[];
  crew: TMDBPersonMovieCredit[];
}

export async function getPersonMovieCredits(personId: number): Promise<TMDBPersonMovieCredits> {
  return fetchTMDB<TMDBPersonMovieCredits>(`/person/${personId}/movie_credits`);
}

/**
 * Get person TV credits
 */
export interface TMDBPersonTVCredit {
  id: number;
  name: string;
  character?: string;
  first_air_date: string;
  vote_average: number;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface TMDBPersonTVCredits {
  cast: TMDBPersonTVCredit[];
  crew: TMDBPersonTVCredit[];
}

export async function getPersonTVCredits(personId: number): Promise<TMDBPersonTVCredits> {
  return fetchTMDB<TMDBPersonTVCredits>(`/person/${personId}/tv_credits`);
}

/**
 * Get movie details
 */
export async function getMovieDetails(movieId: number): Promise<TMDBMovie & { genres: TMDBGenre[]; runtime: number; budget: number; revenue: number }> {
  return fetchTMDB(`/movie/${movieId}`, { append_to_response: "credits,images,similar" });
}

/**
 * Get TV show details
 */
export async function getTVDetails(tvId: number): Promise<TMDBSeries & { genres: TMDBGenre[]; number_of_seasons: number; number_of_episodes: number; episode_run_time: number[] }> {
  return fetchTMDB(`/tv/${tvId}`, { append_to_response: "credits,images,similar" });
}

/**
 * Watch Provider interfaces
 */
export interface TMDBWatchProvider {
  display_priority: number;
  logo_path: string;
  provider_id: number;
  provider_name: string;
}

export interface TMDBWatchProviders {
  link?: string;
  flatrate?: TMDBWatchProvider[];
  buy?: TMDBWatchProvider[];
  rent?: TMDBWatchProvider[];
}

export interface TMDBWatchProvidersResponse {
  id: number;
  results: Record<string, TMDBWatchProviders>;
}

/**
 * Get movie watch providers
 */
export async function getMovieWatchProviders(movieId: number): Promise<TMDBWatchProvidersResponse> {
  return fetchTMDB(`/movie/${movieId}/watch/providers`);
}

/**
 * Get TV show watch providers
 */
export async function getTVWatchProviders(tvId: number): Promise<TMDBWatchProvidersResponse> {
  return fetchTMDB(`/tv/${tvId}/watch/providers`);
}

/**
 * Discover movies with filters
 */
export async function discoverMovies(filters: {
  page?: number;
  genre?: number | number[];
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  sortBy?: string;
  minRating?: number;
  language?: string;
  keywords?: number | number[];
  runtimeMin?: number;
  runtimeMax?: number;
}): Promise<TMDBResponse<TMDBMovie>> {
  const params: Record<string, string | number> = {
    page: filters.page || 1,
  };
  
  if (filters.genre) {
    params.with_genres = Array.isArray(filters.genre) 
      ? filters.genre.join(',') 
      : filters.genre;
  }
  // Handle year range or single year
  if (filters.yearFrom || filters.yearTo) {
    if (filters.yearFrom) {
      params['primary_release_date.gte'] = `${filters.yearFrom}-01-01`;
    }
    if (filters.yearTo) {
      params['primary_release_date.lte'] = `${filters.yearTo}-12-31`;
    }
  } else if (filters.year) {
    params.primary_release_year = filters.year;
  }
  if (filters.sortBy) params.sort_by = filters.sortBy;
  if (filters.minRating) params['vote_average.gte'] = filters.minRating;
  if (filters.language) params.with_original_language = filters.language;
  if (filters.keywords) {
    params.with_keywords = Array.isArray(filters.keywords)
      ? filters.keywords.join(',')
      : filters.keywords;
  }
  // Runtime filtering for movies
  if (filters.runtimeMin !== undefined) {
    params['with_runtime.gte'] = filters.runtimeMin;
  }
  if (filters.runtimeMax !== undefined) {
    params['with_runtime.lte'] = filters.runtimeMax;
  }
  
  return fetchTMDB<TMDBResponse<TMDBMovie>>('/discover/movie', params);
}

/**
 * Discover TV shows with filters
 */
export async function discoverTV(filters: {
  page?: number;
  genre?: number | number[];
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  sortBy?: string;
  minRating?: number;
  language?: string;
  keywords?: number | number[];
  runtimeMin?: number;
  runtimeMax?: number;
}): Promise<TMDBResponse<TMDBSeries>> {
  const params: Record<string, string | number> = {
    page: filters.page || 1,
  };
  
  if (filters.genre) {
    params.with_genres = Array.isArray(filters.genre) 
      ? filters.genre.join(',') 
      : filters.genre;
  }
  // Handle year range or single year
  if (filters.yearFrom || filters.yearTo) {
    if (filters.yearFrom) {
      params['first_air_date.gte'] = `${filters.yearFrom}-01-01`;
    }
    if (filters.yearTo) {
      params['first_air_date.lte'] = `${filters.yearTo}-12-31`;
    }
  } else if (filters.year) {
    params.first_air_date_year = filters.year;
  }
  if (filters.sortBy) params.sort_by = filters.sortBy;
  if (filters.minRating) params['vote_average.gte'] = filters.minRating;
  if (filters.language) params.with_original_language = filters.language;
  if (filters.keywords) {
    params.with_keywords = Array.isArray(filters.keywords)
      ? filters.keywords.join(',')
      : filters.keywords;
  }
  // Runtime filtering for TV shows (episode runtime)
  // Note: TMDB uses with_runtime for TV episode runtime
  if (filters.runtimeMin !== undefined) {
    params['with_runtime.gte'] = filters.runtimeMin;
  }
  if (filters.runtimeMax !== undefined) {
    params['with_runtime.lte'] = filters.runtimeMax;
  }
  
  return fetchTMDB<TMDBResponse<TMDBSeries>>('/discover/tv', params);
}

/**
 * TMDB Video interface
 */
export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
  runtime?: number;
}

export interface TMDBVideosResponse {
  id: number;
  results: TMDBVideo[];
}

/**
 * Get movie videos (trailers, teasers, etc.)
 */
export async function getMovieVideos(movieId: number): Promise<TMDBVideosResponse> {
  return fetchTMDB<TMDBVideosResponse>(`/movie/${movieId}/videos`);
}

/**
 * Get TV show videos (trailers, teasers, etc.)
 */
export async function getTVVideos(tvId: number): Promise<TMDBVideosResponse> {
  return fetchTMDB<TMDBVideosResponse>(`/tv/${tvId}/videos`);
}

/**
 * Get similar movies
 */
export async function getSimilarMovies(movieId: number, page: number = 1): Promise<TMDBResponse<TMDBMovie>> {
  return fetchTMDB<TMDBResponse<TMDBMovie>>(`/movie/${movieId}/similar`, { page });
}

/**
 * Get recommended movies
 */
export async function getRecommendedMovies(movieId: number, page: number = 1): Promise<TMDBResponse<TMDBMovie>> {
  return fetchTMDB<TMDBResponse<TMDBMovie>>(`/movie/${movieId}/recommendations`, { page });
}

/**
 * Get similar TV shows
 */
export async function getSimilarTV(tvId: number, page: number = 1): Promise<TMDBResponse<TMDBSeries>> {
  return fetchTMDB<TMDBResponse<TMDBSeries>>(`/tv/${tvId}/similar`, { page });
}

/**
 * Get recommended TV shows
 */
export async function getRecommendedTV(tvId: number, page: number = 1): Promise<TMDBResponse<TMDBSeries>> {
  return fetchTMDB<TMDBResponse<TMDBSeries>>(`/tv/${tvId}/recommendations`, { page });
}

export function getYouTubeEmbedUrl(key: string, autoplay: boolean = true, muted: boolean = true): string {
  return `https://www.youtube.com/embed/${key}?autoplay=${autoplay ? 1 : 0}&mute=${muted ? 1 : 0}&controls=1&rel=0&modestbranding=1${autoplay ? `&loop=1&playlist=${key}` : ''}`;
}

/**
 * Get YouTube thumbnail URL from video key
 */
export function getYouTubeThumbnailUrl(key: string, quality: 'maxresdefault' | 'hqdefault' | 'mqdefault' = 'hqdefault'): string {
  return `https://img.youtube.com/vi/${key}/${quality}.jpg`;
}

/**
 * TMDB TV Season interface
 */
export interface TMDBTVSeason {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
}

/**
 * TMDB TV Episode interface
 */
export interface TMDBTVEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  still_path: string | null;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
}

/**
 * TMDB TV Season Details interface
 */
export interface TMDBTVSeasonDetails {
  _id: string;
  air_date: string | null;
  episodes: TMDBTVEpisode[];
  name: string;
  overview: string;
  id: number;
  poster_path: string | null;
  season_number: number;
}

/**
 * Get TV show seasons
 */
export async function getTVSeasons(tvId: number): Promise<{ id: number; seasons: TMDBTVSeason[] }> {
  const data = await fetchTMDB<{ id: number; seasons: TMDBTVSeason[] }>(`/tv/${tvId}`);
  return data;
}

/**
 * Get TV show season details with episodes
 */
export async function getTVSeasonDetails(tvId: number, seasonNumber: number): Promise<TMDBTVSeasonDetails> {
  return fetchTMDB<TMDBTVSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
}
