import { NextResponse } from "next/server";
import { getAllGenres, getMovieGenres, getTVGenres, TMDBGenre } from "@/lib/tmdb";

// Fallback genres if TMDB API fails
const FALLBACK_MOVIE_GENRES: TMDBGenre[] = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science Fiction" },
  { id: 10770, name: "TV Movie" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
];

const FALLBACK_TV_GENRES: TMDBGenre[] = [
  { id: 10759, name: "Action & Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 10762, name: "Kids" },
  { id: 9648, name: "Mystery" },
  { id: 10763, name: "News" },
  { id: 10764, name: "Reality" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 10766, name: "Soap" },
  { id: 10767, name: "Talk" },
  { id: 10768, name: "War & Politics" },
  { id: 37, name: "Western" },
];

export async function GET(): Promise<NextResponse<{ movie: TMDBGenre[]; tv: TMDBGenre[]; all: TMDBGenre[] }>> {
  try {
    const [movieGenres, tvGenres] = await Promise.all([
      getMovieGenres(),
      getTVGenres(),
    ]);
    
    // Combine for "all" option
    const allGenresMap = new Map<number, TMDBGenre>();
    movieGenres.forEach(genre => allGenresMap.set(genre.id, genre));
    tvGenres.forEach(genre => allGenresMap.set(genre.id, genre));
    const allGenres = Array.from(allGenresMap.values());
    
    return NextResponse.json(
      {
        movie: movieGenres,
        tv: tvGenres,
        all: allGenres,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error("Genres API error:", error);
    // Return fallback genres on error
    const allGenresMap = new Map<number, TMDBGenre>();
    FALLBACK_MOVIE_GENRES.forEach(genre => allGenresMap.set(genre.id, genre));
    FALLBACK_TV_GENRES.forEach(genre => allGenresMap.set(genre.id, genre));
    const allGenres = Array.from(allGenresMap.values());
    
    return NextResponse.json(
      {
        movie: FALLBACK_MOVIE_GENRES,
        tv: FALLBACK_TV_GENRES,
        all: allGenres,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      }
    );
  }
}
