import { NextRequest, NextResponse } from "next/server";
import { getMovieReviews, getTVReviews } from "@/lib/tmdb";

/**
 * GET /api/reviews/tmdb?tmdbId=123&mediaType=movie&page=1
 * Fetches reviews from TMDB API
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tmdbId = searchParams.get("tmdbId");
    const mediaType = searchParams.get("mediaType") as "movie" | "tv" | null;
    const page = parseInt(searchParams.get("page") || "1", 10);

    if (!tmdbId || !mediaType) {
      return NextResponse.json(
        { error: "tmdbId and mediaType are required" },
        { status: 400 }
      );
    }

    const id = parseInt(tmdbId, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid tmdbId" },
        { status: 400 }
      );
    }

    let reviews;
    if (mediaType === "movie") {
      reviews = await getMovieReviews(id, page);
    } else {
      reviews = await getTVReviews(id, page);
    }

    return NextResponse.json(reviews, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("Error fetching TMDB reviews:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch TMDB reviews";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

