import { NextRequest, NextResponse } from "next/server";
import { getIMDBRating } from "@/lib/omdb";
import { resolveDisplayRating } from "@/lib/rating-quality";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb";

/**
 * GET /api/imdb-rating-by-tmdb?tmdbId=123&type=movie
 * Fetches IMDb rating using TMDB ID and type; only returns ratings with reliable vote counts.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tmdbId = searchParams.get("tmdbId");
    const typeRaw = searchParams.get("type");
    const type = (typeRaw ?? "").toLowerCase();

    if (!tmdbId || !type) {
      return NextResponse.json({ error: "tmdbId and type are required" }, { status: 400 });
    }

    const tmdbIdNum = parseInt(tmdbId, 10);
    if (isNaN(tmdbIdNum)) {
      return NextResponse.json({ error: "Invalid tmdbId" }, { status: 400 });
    }

    let imdbId: string | null = null;
    let tmdbRating: number | null = null;
    let tmdbVoteCount: number | null = null;

    try {
      if (type === "movie") {
        const details = await getMovieDetails(tmdbIdNum);
        imdbId = details.external_ids?.imdb_id || null;
        tmdbRating = details.vote_average > 0 ? details.vote_average : null;
        tmdbVoteCount = details.vote_count ?? null;
      } else if (type === "tv") {
        const details = await getTVDetails(tmdbIdNum);
        imdbId = details.external_ids?.imdb_id || null;
        tmdbRating = details.vote_average > 0 ? details.vote_average : null;
        tmdbVoteCount = details.vote_count ?? null;
      } else {
        return NextResponse.json({ error: "Invalid type. Must be 'movie' or 'tv'" }, { status: 400 });
      }
    } catch (error) {
      console.error("Error fetching TMDB details:", error);
    }

    let imdbRating: { rating: number; votes: number } | null = null;
    if (imdbId) {
      try {
        const fetched = await getIMDBRating(imdbId);
        if (fetched) {
          imdbRating = { rating: fetched.rating, votes: fetched.votes };
        }
      } catch (error) {
        console.warn("OMDB lookup failed for imdb-rating-by-tmdb; falling back:", error);
      }
    }

    const resolved = resolveDisplayRating({
      imdbRating: imdbRating?.rating ?? null,
      imdbVotes: imdbRating?.votes ?? null,
      tmdbRating,
      tmdbVoteCount,
    });

    if (resolved) {
      return NextResponse.json(
        {
          rating: resolved.rating,
          votes: resolved.votes,
          source: resolved.source,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
          },
        }
      );
    }

    return NextResponse.json(
      { rating: null, source: null },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
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
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      }
    );
  }
}
