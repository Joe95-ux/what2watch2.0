import { NextRequest, NextResponse } from "next/server";
import {
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
  getTopRatedTV,
  discoverMovies,
  discoverTV,
  TMDBMovie,
  TMDBSeries,
} from "@/lib/tmdb";

// Genre IDs for diverse content selection
const GENRE_IDS = [28, 12, 35, 18, 27, 878, 53, 10749, 80, 16, 14, 36];

// Fallback content if API fails
const getFallbackContent = (): Array<(TMDBMovie & { type: "movie" }) | (TMDBSeries & { type: "tv" })> => {
  // Return empty array - component will handle gracefully
  return [];
};

export async function GET(request: NextRequest): Promise<NextResponse<{ results: Array<(TMDBMovie & { type: "movie" }) | (TMDBSeries & { type: "tv" })> } | { error: string }>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phase = parseInt(searchParams.get("phase") || "1", 10);

    // Add timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 20000); // 20 second total timeout
    });

    const fetchPromise = (async () => {
      let results: Array<(TMDBMovie & { type: "movie" }) | (TMDBSeries & { type: "tv" })> = [];

      if (phase === 1) {
        // Popular movies and TV shows
        const [movies, tv] = await Promise.all([
          getPopularMovies(1),
          getPopularTV(1),
        ]);

        const mixed: Array<(TMDBMovie & { type: "movie" }) | (TMDBSeries & { type: "tv" })> = [
          ...movies.results.slice(0, 10).map((m) => ({ ...m, type: "movie" as const })),
          ...tv.results.slice(0, 10).map((t) => ({ ...t, type: "tv" as const })),
        ];

        results = shuffleAndDiversify(mixed);
      } else if (phase === 2) {
        // Top rated content
        const [movies, tv] = await Promise.all([
          getTopRatedMovies(1),
          getTopRatedTV(1),
        ]);

        const mixed: Array<(TMDBMovie & { type: "movie" }) | (TMDBSeries & { type: "tv" })> = [
          ...movies.results.slice(0, 10).map((m) => ({ ...m, type: "movie" as const })),
          ...tv.results.slice(0, 10).map((t) => ({ ...t, type: "tv" as const })),
        ];

        results = shuffleAndDiversify(mixed);
      } else if (phase === 3) {
        // Diverse genres - fetch from different genres
        const genrePromises = GENRE_IDS.slice(0, 6).map(async (genreId) => {
          const [movies, tv] = await Promise.all([
            discoverMovies({ genre: genreId, page: 1, sortBy: "popularity.desc" }),
            discoverTV({ genre: genreId, page: 1, sortBy: "popularity.desc" }),
          ]);

          return [
            ...movies.results.slice(0, 2).map((m) => ({ ...m, type: "movie" as const })),
            ...tv.results.slice(0, 2).map((t) => ({ ...t, type: "tv" as const })),
          ];
        });

        const genreResults = await Promise.all(genrePromises);
        const flat = genreResults.flat();
        results = shuffleAndDiversify(flat);
      }

      // Limit to 20 items per phase
      return results.slice(0, 20);
    })();

    let results: Array<(TMDBMovie & { type: "movie" }) | (TMDBSeries & { type: "tv" })>;
    
    try {
      results = await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      console.warn("TMDB API failed or timed out, using fallback:", error);
      results = getFallbackContent();
    }

    return NextResponse.json(
      { results },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error("Onboarding content API error:", error);
    // Return empty results on error - component will handle gracefully
    return NextResponse.json(
      { results: [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      }
    );
  }
}

// Helper to shuffle and ensure genre diversity
function shuffleAndDiversify<T extends { genre_ids?: number[] }>(
  items: T[]
): T[] {
  // Shuffle array
  const shuffled = [...items].sort(() => Math.random() - 0.5);

  // Try to ensure we have diverse genres
  const seenGenres = new Set<number>();
  const prioritized: T[] = [];
  const rest: T[] = [];

  shuffled.forEach((item) => {
    if (item.genre_ids && item.genre_ids.length > 0) {
      const hasNewGenre = item.genre_ids.some((id) => !seenGenres.has(id));
      if (hasNewGenre) {
        prioritized.push(item);
        item.genre_ids.forEach((id) => seenGenres.add(id));
      } else {
        rest.push(item);
      }
    } else {
      rest.push(item);
    }
  });

  return [...prioritized, ...rest];
}
