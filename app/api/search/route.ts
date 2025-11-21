import { NextRequest, NextResponse } from "next/server";
import { searchMovies, searchTV, searchPerson, discoverMovies, discoverTV, TMDBResponse, TMDBMovie, TMDBSeries, TMDBSearchPersonResponse } from "@/lib/tmdb";

type SearchType = "movie" | "tv" | "person" | "all";

interface ErrorResponse {
  error: string;
}

const createEmptyResponse = (): TMDBResponse<TMDBMovie | TMDBSeries> => ({
  page: 1,
  results: [],
  total_pages: 0,
  total_results: 0,
});

export async function GET(request: NextRequest): Promise<NextResponse<TMDBResponse<TMDBMovie | TMDBSeries> | ErrorResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");
    const type = (searchParams.get("type") || "all") as SearchType;
    const pageParam = searchParams.get("page");
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const genreParam = searchParams.get("genre");
    // Parse genre from comma-separated string to array
    const genre = genreParam 
      ? genreParam.split(",").map(id => parseInt(id, 10)).filter(id => !isNaN(id))
      : null;
    const yearParam = searchParams.get("year");
    // Parse year - can be a single year or a range (e.g., "2018" or "2018-2019")
    let year: number | undefined;
    let yearFrom: number | undefined;
    let yearTo: number | undefined;
    if (yearParam) {
      if (yearParam.includes("-")) {
        const [from, to] = yearParam.split("-").map(y => parseInt(y.trim(), 10));
        if (!isNaN(from)) yearFrom = from;
        if (!isNaN(to)) yearTo = to;
      } else {
        const parsedYear = parseInt(yearParam, 10);
        if (!isNaN(parsedYear)) year = parsedYear;
      }
    }
    const minRating = searchParams.get("minRating");
    const sortBy = searchParams.get("sortBy") || "popularity.desc";
    const runtimeMinParam = searchParams.get("runtimeMin");
    const runtimeMaxParam = searchParams.get("runtimeMax");
    const runtimeMin = runtimeMinParam ? parseInt(runtimeMinParam, 10) : undefined;
    const runtimeMax = runtimeMaxParam ? parseInt(runtimeMaxParam, 10) : undefined;

    // Allow requests with filters even without query
    const hasQuery = query && query.trim().length > 0;
    const hasFilters = !!(genre || year || yearFrom || yearTo || minRating || runtimeMin !== undefined || runtimeMax !== undefined);
    
    if (!hasQuery && !hasFilters) {
      return NextResponse.json(
        { error: "Query parameter or filters are required" },
        { status: 400 }
      );
    }

    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: "Invalid page parameter" },
        { status: 400 }
      );
    }

    // Add timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 15000); // 15 second total timeout
    });

    let results: TMDBResponse<TMDBMovie | TMDBSeries>;

    try {
      // If filters are provided, use discover instead of search
      if (genre || year || yearFrom || yearTo || minRating || runtimeMin !== undefined || runtimeMax !== undefined) {
        // For multiple genres, use OR logic (search each genre separately and combine)
        // TMDB's with_genres uses AND logic, which is too restrictive
        if (genre && genre.length > 1) {
          // Multiple genres: search each genre separately and combine results
          const baseFilters = {
            page: 1, // Get first page from each genre search
            ...(year && { year }),
            ...(yearFrom && { yearFrom }),
            ...(yearTo && { yearTo }),
            ...(minRating && { minRating: parseFloat(minRating) }),
            ...(runtimeMin !== undefined && { runtimeMin }),
            ...(runtimeMax !== undefined && { runtimeMax }),
            sortBy,
          };

          const genreSearches = genre.map(genreId => {
            const filters = { ...baseFilters, genre: genreId };
            if (type === "movie") {
              return discoverMovies(filters);
            } else if (type === "tv") {
              return discoverTV(filters);
            } else {
              return Promise.all([discoverMovies(filters), discoverTV(filters)]);
            }
          });

          const allResults = await Promise.race([
            Promise.all(genreSearches),
            timeoutPromise,
          ]);

          // Combine and deduplicate results
          const seenIds = new Set<number>();
          const combinedResults: (TMDBMovie | TMDBSeries)[] = [];

          for (const result of allResults) {
            if (Array.isArray(result)) {
              // "all" type - result is [movies, tv]
              const [movies, tv] = result;
              [...movies.results, ...tv.results].forEach(item => {
                if (!seenIds.has(item.id)) {
                  seenIds.add(item.id);
                  combinedResults.push(item);
                }
              });
            } else {
              // Single type - result is TMDBResponse
              result.results.forEach(item => {
                if (!seenIds.has(item.id)) {
                  seenIds.add(item.id);
                  combinedResults.push(item);
                }
              });
            }
          }

          // Sort combined results by popularity (or other sortBy)
          // Note: This is a simplified sort - for better results, we'd need to re-fetch with proper sorting
          combinedResults.sort((a, b) => {
            if (sortBy === "popularity.desc") {
              return (b.popularity || 0) - (a.popularity || 0);
            } else if (sortBy === "vote_average.desc") {
              return (b.vote_average || 0) - (a.vote_average || 0);
            } else if (sortBy === "release_date.desc") {
              const aDate = "release_date" in a ? a.release_date : a.first_air_date;
              const bDate = "release_date" in b ? b.release_date : b.first_air_date;
              return (bDate || "").localeCompare(aDate || "");
            }
            return 0;
          });

          // Paginate combined results
          const itemsPerPage = 20;
          const startIndex = (page - 1) * itemsPerPage;
          const paginatedResults = combinedResults.slice(startIndex, startIndex + itemsPerPage);
          const totalPages = Math.ceil(combinedResults.length / itemsPerPage);

          results = {
            page,
            results: paginatedResults,
            total_pages: totalPages,
            total_results: combinedResults.length,
          };
        } else {
          // Single genre or no genre: use normal discover
          const filters = {
            page,
            ...(genre && genre.length > 0 && { genre: genre[0] }),
            ...(year && { year }),
            ...(yearFrom && { yearFrom }),
            ...(yearTo && { yearTo }),
            ...(minRating && { minRating: parseFloat(minRating) }),
            ...(runtimeMin !== undefined && { runtimeMin }),
            ...(runtimeMax !== undefined && { runtimeMax }),
            sortBy,
          };

          if (type === "movie") {
            results = await Promise.race([discoverMovies(filters), timeoutPromise]);
          } else if (type === "tv") {
            results = await Promise.race([discoverTV(filters), timeoutPromise]);
          } else {
            // Search both
            const [movies, tv] = await Promise.race([
              Promise.all([discoverMovies(filters), discoverTV(filters)]),
              timeoutPromise,
            ]);
            results = {
              page,
              results: [...movies.results, ...tv.results],
              total_pages: Math.max(movies.total_pages, tv.total_pages),
              total_results: movies.total_results + tv.total_results,
            };
          }
        }
      } else if (query) {
        // Regular search
        if (type === "movie") {
          results = await Promise.race([searchMovies(query, page), timeoutPromise]);
        } else if (type === "tv") {
          results = await Promise.race([searchTV(query, page), timeoutPromise]);
        } else {
          // Search both and combine
          const [movies, tv] = await Promise.race([
            Promise.all([searchMovies(query, page), searchTV(query, page)]),
            timeoutPromise,
          ]);
          results = {
            page,
            results: [...movies.results, ...tv.results],
            total_pages: Math.max(movies.total_pages, tv.total_pages),
            total_results: movies.total_results + tv.total_results,
          };
        }
      } else {
        results = createEmptyResponse();
      }
    } catch (error) {
      // Check if it's a timeout error (from either route-level or fetch-level)
      const isTimeout = error instanceof Error && (
        error.message.includes('timeout') || 
        error.message.includes('Request timeout') ||
        error.message.includes('ETIMEDOUT') ||
        error.name === 'AbortError'
      );
      
      console.warn(`Search API ${isTimeout ? 'timeout' : 'error'}, returning empty results:`, error);
      return NextResponse.json(createEmptyResponse(), {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      });
    }

    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(createEmptyResponse(), {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    });
  }
}
