import { NextRequest, NextResponse } from "next/server";
import { getIMDBRating } from "@/lib/omdb";
import { resolveDisplayRating } from "@/lib/rating-quality";

/**
 * GET /api/imdb-rating?imdbId=tt1234567&tmdbRating=7.5&tmdbVoteCount=5000
 * Fetches IMDb rating from OMDB API; falls back to TMDB only when vote count is reliable.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imdbId = searchParams.get("imdbId");
    const tmdbRatingRaw = searchParams.get("tmdbRating");
    const tmdbVoteCountRaw = searchParams.get("tmdbVoteCount");

    const tmdbRating =
      tmdbRatingRaw != null && tmdbRatingRaw !== "" ? parseFloat(tmdbRatingRaw) : null;
    const tmdbVoteCount =
      tmdbVoteCountRaw != null && tmdbVoteCountRaw !== ""
        ? parseInt(tmdbVoteCountRaw, 10)
        : null;

    let imdbRating: { rating: number; votes: number } | null = null;
    if (imdbId) {
      const fetched = await getIMDBRating(imdbId);
      if (fetched) {
        imdbRating = { rating: fetched.rating, votes: fetched.votes };
      }
    }

    const resolved = resolveDisplayRating({
      imdbRating: imdbRating?.rating ?? null,
      imdbVotes: imdbRating?.votes ?? null,
      tmdbRating: tmdbRating != null && !Number.isNaN(tmdbRating) ? tmdbRating : null,
      tmdbVoteCount: tmdbVoteCount != null && !Number.isNaN(tmdbVoteCount) ? tmdbVoteCount : null,
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

    return NextResponse.json({ error: "No rating available" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching IMDb rating:", error);

    const searchParams = request.nextUrl.searchParams;
    const tmdbRatingRaw = searchParams.get("tmdbRating");
    const tmdbVoteCountRaw = searchParams.get("tmdbVoteCount");
    const tmdbRating =
      tmdbRatingRaw != null && tmdbRatingRaw !== "" ? parseFloat(tmdbRatingRaw) : null;
    const tmdbVoteCount =
      tmdbVoteCountRaw != null && tmdbVoteCountRaw !== ""
        ? parseInt(tmdbVoteCountRaw, 10)
        : null;

    const resolved = resolveDisplayRating({
      tmdbRating: tmdbRating != null && !Number.isNaN(tmdbRating) ? tmdbRating : null,
      tmdbVoteCount: tmdbVoteCount != null && !Number.isNaN(tmdbVoteCount) ? tmdbVoteCount : null,
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
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Failed to fetch IMDb rating";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
