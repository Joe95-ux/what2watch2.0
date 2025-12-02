import { NextRequest, NextResponse } from "next/server";
import { getIMDBRating } from "@/lib/omdb";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb";

/**
 * GET /api/imdb-rating-by-tmdb?tmdbId=123&type=movie
 * Fetches IMDb rating using TMDB ID and type
 * Falls back to TMDB rating if OMDB fails
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tmdbId = searchParams.get("tmdbId");
    const type = searchParams.get("type"); // "movie" or "tv"

    if (!tmdbId || !type) {
      return NextResponse.json(
        { error: "tmdbId and type are required" },
        { status: 400 }
      );
    }

    const tmdbIdNum = parseInt(tmdbId, 10);
    if (isNaN(tmdbIdNum)) {
      return NextResponse.json(
        { error: "Invalid tmdbId" },
        { status: 400 }
      );
    }

    // Fetch details to get IMDb ID
    let imdbId: string | null = null;
    let tmdbRating: number | null = null;

    try {
      if (type === "movie") {
        const details = await getMovieDetails(tmdbIdNum);
        imdbId = details.external_ids?.imdb_id || null;
        tmdbRating = details.vote_average > 0 ? details.vote_average : null;
      } else if (type === "tv") {
        const details = await getTVDetails(tmdbIdNum);
        imdbId = details.external_ids?.imdb_id || null;
        tmdbRating = details.vote_average > 0 ? details.vote_average : null;
      } else {
        return NextResponse.json(
          { error: "Invalid type. Must be 'movie' or 'tv'" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Error fetching TMDB details:", error);
      // Continue to try with just TMDB rating if available
    }

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
      return NextResponse.json(
        {
          rating: tmdbRating,
          source: "tmdb",
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400', // Cache for 1 hour
          },
        }
      );
    }

    // No rating available
    return NextResponse.json(
      { rating: null, source: null },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error("Error fetching IMDb rating by TMDB ID:", error);
    return NextResponse.json(
      { rating: null, source: null },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      }
    );
  }
}

