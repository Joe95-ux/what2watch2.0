import { NextRequest, NextResponse } from "next/server";
import { getIMDBRating } from "@/lib/omdb";

/**
 * GET /api/imdb-rating?imdbId=tt1234567
 * Fetches IMDb rating from OMDB API
 * Falls back to TMDB rating if OMDB fails
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imdbId = searchParams.get("imdbId");
    const tmdbRating = searchParams.get("tmdbRating"); // Fallback rating from TMDB

    // Try to fetch from OMDB if IMDb ID is available
    let imdbRating = null;
    if (imdbId) {
      imdbRating = await getIMDBRating(imdbId);
    }

    if (imdbRating) {
      return NextResponse.json(
        {
          rating: imdbRating.rating,
          votes: imdbRating.votes,
          source: "imdb",
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800', // Cache for 24 hours
          },
        }
      );
    }

    // Fallback to TMDB rating if OMDB fails
    if (tmdbRating) {
      const rating = parseFloat(tmdbRating);
      if (!isNaN(rating) && rating > 0) {
        return NextResponse.json(
          {
            rating,
            source: "tmdb",
          },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400', // Cache for 1 hour
            },
          }
        );
      }
    }

    return NextResponse.json(
      { error: "No rating available" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error fetching IMDb rating:", error);
    
    // Fallback to TMDB rating on error
    const searchParams = request.nextUrl.searchParams;
    const tmdbRating = searchParams.get("tmdbRating");
    
    if (tmdbRating) {
      const rating = parseFloat(tmdbRating);
      if (!isNaN(rating) && rating > 0) {
        return NextResponse.json(
          {
            rating,
            source: "tmdb",
          },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
          }
        );
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Failed to fetch IMDb rating";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

