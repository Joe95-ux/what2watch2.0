import { NextResponse } from "next/server";
import { getAllGenres, TMDBGenre } from "@/lib/tmdb";

// Fallback genres if TMDB API fails
const FALLBACK_GENRES: TMDBGenre[] = [
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

export async function GET(): Promise<NextResponse<{ movie: TMDBGenre[]; tv: TMDBGenre[]; all: TMDBGenre[] }>> {
  try {
    const allGenres = await getAllGenres();
    
    return NextResponse.json(
      {
        movie: allGenres,
        tv: allGenres,
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
    return NextResponse.json(
      {
        movie: FALLBACK_GENRES,
        tv: FALLBACK_GENRES,
        all: FALLBACK_GENRES,
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
