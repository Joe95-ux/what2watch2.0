"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useSearch } from "@/hooks/use-search";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { MoreLikeThisCardSkeleton } from "@/components/skeletons/more-like-this-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { FiltersSheet, type SearchFilters } from "@/components/filters/filters-sheet";
import { useWatchProviders } from "@/hooks/use-watch-providers";
import { useWatchRegions } from "@/hooks/use-watch-regions";

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [movieGenres, setMovieGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [tvGenres, setTVGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [allGenres, setAllGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const GENRES_TO_SHOW = 8;

  // Get params from URL
  const query = searchParams.get("query") || "";
  const type = (searchParams.get("type") || "all") as "all" | "movie" | "tv";
  const genreParam = searchParams.get("genre") || "";
  // Parse genre from comma-separated string to array
  const genre = genreParam ? genreParam.split(",").map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : [];
  const year = searchParams.get("year") || "";
  const minRating = searchParams.get("minRating") ? parseFloat(searchParams.get("minRating")!) : 0;
  const sortBy = searchParams.get("sortBy") || "popularity.desc";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const runtimeMin = searchParams.get("runtimeMin") ? parseInt(searchParams.get("runtimeMin")!, 10) : undefined;
  const runtimeMax = searchParams.get("runtimeMax") ? parseInt(searchParams.get("runtimeMax")!, 10) : undefined;
  const withOriginCountry = searchParams.get("withOriginCountry") || undefined;
  const watchProviderParam = searchParams.get("watchProvider");
  const watchProvider = watchProviderParam ? parseInt(watchProviderParam, 10) : undefined;
  const watchRegion = searchParams.get("watchRegion") || "US";

  const [filters, setFilters] = useState<SearchFilters>({
    type,
    genre,
    year,
    minRating,
    sortBy,
    watchProvider,
  });

  // Update filters when URL params change
  useEffect(() => {
    const genreParam = searchParams.get("genre") || "";
    const genreArray = genreParam ? genreParam.split(",").map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : [];
    const wp = searchParams.get("watchProvider");
    const watchProviderFromUrl = wp ? parseInt(wp, 10) : undefined;
    const wr = searchParams.get("watchRegion") || "US";
    setFilters({
      type: (searchParams.get("type") || "all") as "all" | "movie" | "tv",
      genre: genreArray,
      year: searchParams.get("year") || "",
      minRating: searchParams.get("minRating") ? parseFloat(searchParams.get("minRating")!) : 0,
      sortBy: searchParams.get("sortBy") || "popularity.desc",
      watchProvider: watchProviderFromUrl != null && !Number.isNaN(watchProviderFromUrl) ? watchProviderFromUrl : undefined,
      watchRegion: wr,
    });
  }, [searchParams]);

  const { data: watchRegions = [] } = useWatchRegions();
  const { data: watchProviders = [] } = useWatchProviders(filters.watchRegion || "US", { all: true });

  // Fetch genres
  useEffect(() => {
    fetch("/api/genres")
      .then((res) => res.json())
      .then((data) => {
        if (data.movie) setMovieGenres(data.movie);
        if (data.tv) setTVGenres(data.tv);
        if (data.all) setAllGenres(data.all);
      })
      .catch(console.error);
  }, []);

  // Fetch search results
  const { data, isLoading, error } = useSearch({
    query: query || undefined,
    type,
    genre: genre.length > 0 ? genre : undefined,
    year: year || undefined,
    minRating: minRating > 0 ? minRating : undefined,
    sortBy,
    page,
    pageSize: 42,
    runtimeMin,
    runtimeMax,
    withOriginCountry,
    watchProvider: watchProvider !== undefined && !Number.isNaN(watchProvider) ? watchProvider : undefined,
    watchRegion,
  });

  const results = data?.results || [];
  const totalPages = data?.total_pages || 0;
  const totalResults = data?.total_results || 0;
  const currentPage = data?.page || 1;

  const streamingProvider =
    watchProvider !== undefined && !Number.isNaN(watchProvider)
      ? watchProviders.find((p) => p.provider_id === watchProvider) ?? null
      : null;
  const streamingProviderName = streamingProvider?.provider_name ?? null;

  const updateURL = (newParams: Record<string, string | number | number[] | undefined>) => {
    const params = new URLSearchParams();
    
    // Preserve existing parameters if not being overridden
    if (query && !newParams.hasOwnProperty("query")) {
      params.set("query", query);
    }
    if (type && type !== "all" && !newParams.hasOwnProperty("type")) {
      params.set("type", type);
    }
    if (genre.length > 0 && !newParams.hasOwnProperty("genre")) {
      params.set("genre", genre.join(","));
    }
    if (year && !newParams.hasOwnProperty("year")) {
      params.set("year", year);
    }
    if (minRating > 0 && !newParams.hasOwnProperty("minRating")) {
      params.set("minRating", minRating.toString());
    }
    if (sortBy && !newParams.hasOwnProperty("sortBy")) {
      params.set("sortBy", sortBy);
    }
    // Preserve runtime and country filters
    if (runtimeMin !== undefined && !newParams.hasOwnProperty("runtimeMin")) {
      params.set("runtimeMin", runtimeMin.toString());
    }
    if (runtimeMax !== undefined && !newParams.hasOwnProperty("runtimeMax")) {
      params.set("runtimeMax", runtimeMax.toString());
    }
    if (withOriginCountry && !newParams.hasOwnProperty("withOriginCountry")) {
      params.set("withOriginCountry", withOriginCountry);
    }
    if (watchProvider !== undefined && !isNaN(watchProvider) && !newParams.hasOwnProperty("watchProvider")) {
      params.set("watchProvider", watchProvider.toString());
    }
    if (watchRegion && watchRegion !== "US" && !newParams.hasOwnProperty("watchRegion")) {
      params.set("watchRegion", watchRegion);
    }
    
    // Apply new parameters (these override existing ones)
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Always include page, even if it's 1
        if (key === "page") {
          params.set(key, value.toString());
        } else if (key === "genre") {
          // Handle genre array - convert to comma-separated string or remove if empty
          if (Array.isArray(value) && value.length > 0) {
            params.set(key, value.join(","));
          } else if (Array.isArray(value) && value.length === 0) {
            params.delete(key);
          } else {
            params.set(key, value.toString());
          }
        } else if (key === "type") {
          // Always include type, even if "all" (we'll handle it)
          if (value !== "all") {
            params.set(key, value.toString());
          } else {
            params.delete(key);
          }
        } else if (key === "year") {
          // Handle year - include if not empty
          if (value && value !== "") {
            params.set(key, value.toString());
          } else {
            params.delete(key);
          }
        } else if (key === "minRating") {
          // Only include if greater than 0
          if (value && Number(value) > 0) {
            params.set(key, value.toString());
          } else {
            params.delete(key);
          }
        } else if (key === "sortBy") {
          // Always include sortBy if provided
          params.set(key, value.toString());
        } else if (key === "runtimeMin" || key === "runtimeMax") {
          // Handle runtime parameters
          if (value !== undefined && value !== null) {
            params.set(key, value.toString());
          } else {
            params.delete(key);
          }
        } else if (key === "withOriginCountry") {
          // Handle country parameter
          if (value && value !== "") {
            params.set(key, value.toString());
          } else {
            params.delete(key);
          }
        } else if (value && value !== "all" && value !== "" && value !== 0) {
          params.set(key, value.toString());
        }
      } else {
        // Remove parameter if value is undefined/null
        params.delete(key);
      }
    });
    
    router.push(`/search?${params.toString()}`);
  };

  const handleApplyFilters = () => {
    updateURL({
      type: filters.type,
      genre: filters.genre.length > 0 ? filters.genre : undefined,
      year: filters.year || "",
      minRating: filters.minRating > 0 ? filters.minRating : undefined,
      sortBy: filters.sortBy,
      page: 1, // Reset to page 1 when filters change
      watchProvider: filters.watchProvider,
      watchRegion: watchRegion,
      // Preserve runtime and country filters when applying other filters
      runtimeMin: runtimeMin,
      runtimeMax: runtimeMax,
      withOriginCountry: withOriginCountry,
    });
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    const resetFilters: SearchFilters = {
      type: "all",
      genre: [],
      year: "",
      minRating: 0,
      sortBy: "popularity.desc",
      watchProvider: undefined,
      watchRegion: "US",
    };
    setFilters(resetFilters);
    updateURL({
      type: "all",
      genre: undefined,
      year: undefined,
      minRating: undefined,
      sortBy: "popularity.desc",
      page: 1,
      watchProvider: undefined,
      watchRegion: "US",
    });
  };

  const hasActiveFilters: boolean = filters.type !== "all" || filters.genre.length > 0 || !!filters.year || filters.minRating > 0 || runtimeMin !== undefined || runtimeMax !== undefined || !!withOriginCountry || (filters.watchProvider !== undefined && filters.watchProvider > 0);
  const currentYear = new Date().getFullYear();
  const startYear = 1900;

  // Determine content type for cards
  const getContentType = (item: TMDBMovie | TMDBSeries): "movie" | "tv" => {
    return "title" in item ? "movie" : "tv";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              {query ? (
                `Search Results for "${query}"`
              ) : streamingProviderName ? (
                <>
                  {streamingProvider?.logo_path && (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${streamingProvider.logo_path}`}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <span>Streaming on {streamingProviderName}</span>
                </>
              ) : hasActiveFilters ? (
                "Filtered Results"
              ) : (
                "Search Results"
              )}
            </h1>
            {totalResults > 0 && (
              <p className="text-muted-foreground">
                {totalResults.toLocaleString()} {totalResults === 1 ? "result" : "results"} found
              </p>
            )}
          </div>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 cursor-pointer">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {[
                      filters.type !== "all",
                      filters.genre.length > 0,
                      !!filters.year,
                      filters.minRating > 0,
                      (filters.watchProvider !== undefined && filters.watchProvider > 0),
                    ].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0">
              <FiltersSheet
                filters={filters}
                setFilters={setFilters}
                movieGenres={movieGenres}
                tvGenres={tvGenres}
                allGenres={allGenres}
                watchProviders={watchProviders}
                watchRegions={watchRegions}
                resetFilters={resetFilters}
                onApply={handleApplyFilters}
                isLoading={isLoading}
                showAllGenres={showAllGenres}
                setShowAllGenres={setShowAllGenres}
                GENRES_TO_SHOW={GENRES_TO_SHOW}
                currentYear={currentYear}
                startYear={startYear}
                hasActiveFilters={hasActiveFilters}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(20)].map((_, i) => (
              <MoreLikeThisCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Error loading search results. Please try again.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-2">No results found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search query or filters
            </p>
          </div>
        ) : (
          <>
            {/* Results Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
              {results.map((item) => (
                <MoreLikeThisCard
                  key={item.id}
                  item={item}
                  type={getContentType(item)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateURL({ page: currentPage - 1 })}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateURL({ page: pageNum })}
                        disabled={isLoading}
                        className="min-w-[40px]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateURL({ page: currentPage + 1 })}
                  disabled={currentPage === totalPages || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(20)].map((_, i) => (
              <MoreLikeThisCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}

