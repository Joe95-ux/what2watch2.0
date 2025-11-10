"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useSearch } from "@/hooks/use-search";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { FiltersSheet, type SearchFilters } from "@/components/filters/filters-sheet";

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [genres, setGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const GENRES_TO_SHOW = 8;

  // Get params from URL
  const query = searchParams.get("query") || "";
  const type = (searchParams.get("type") || "all") as "all" | "movie" | "tv";
  const genre = searchParams.get("genre") || "";
  const year = searchParams.get("year") || "";
  const minRating = searchParams.get("minRating") ? parseFloat(searchParams.get("minRating")!) : 0;
  const sortBy = searchParams.get("sortBy") || "popularity.desc";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [filters, setFilters] = useState<SearchFilters>({
    type,
    genre,
    year,
    minRating,
    sortBy,
  });

  // Update filters when URL params change
  useEffect(() => {
    setFilters({
      type: (searchParams.get("type") || "all") as "all" | "movie" | "tv",
      genre: searchParams.get("genre") || "",
      year: searchParams.get("year") || "",
      minRating: searchParams.get("minRating") ? parseFloat(searchParams.get("minRating")!) : 0,
      sortBy: searchParams.get("sortBy") || "popularity.desc",
    });
  }, [searchParams]);

  // Fetch genres
  useEffect(() => {
    fetch("/api/genres")
      .then((res) => res.json())
      .then((data) => {
        if (data.all) {
          setGenres(data.all);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch search results
  const { data, isLoading, error } = useSearch({
    query: query || undefined,
    type,
    genre: genre || undefined,
    year: year || undefined,
    minRating: minRating > 0 ? minRating : undefined,
    sortBy,
    page,
  });

  const results = data?.results || [];
  const totalPages = data?.total_pages || 0;
  const totalResults = data?.total_results || 0;
  const currentPage = data?.page || 1;

  const updateURL = (newParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    // Preserve all existing URL parameters
    if (query) params.set("query", query);
    if (type && type !== "all") params.set("type", type);
    // Always include genre if it's set (even if empty string, we need to handle it)
    if (genre) params.set("genre", genre);
    if (year) params.set("year", year);
    if (minRating > 0) params.set("minRating", minRating.toString());
    if (sortBy) params.set("sortBy", sortBy);
    
    // Apply new parameters (overriding existing ones)
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Always include page, even if it's 1
        if (key === "page") {
          params.set(key, value.toString());
        } else if (key === "genre") {
          // Always include genre if it's provided, even if empty (to clear it)
          params.set(key, value.toString());
        } else if (value && value !== "all" && value !== "" && value !== 0) {
          params.set(key, value.toString());
        }
      }
    });
    router.push(`/search?${params.toString()}`);
  };

  const handleApplyFilters = () => {
    updateURL({
      type: filters.type,
      genre: filters.genre || "", // Always include genre, even if empty
      year: filters.year || "",
      minRating: filters.minRating > 0 ? filters.minRating : undefined,
      sortBy: filters.sortBy,
      page: 1, // Reset to page 1 when filters change
    });
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    const resetFilters: SearchFilters = {
      type: "all",
      genre: "",
      year: "",
      minRating: 0,
      sortBy: "popularity.desc",
    };
    setFilters(resetFilters);
    updateURL({
      type: "all",
      genre: undefined,
      year: undefined,
      minRating: undefined,
      sortBy: "popularity.desc",
      page: 1,
    });
  };

  const hasActiveFilters: boolean = filters.type !== "all" || !!filters.genre || !!filters.year || filters.minRating > 0;
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
            <h1 className="text-3xl font-bold mb-2">
              {query ? (
                `Search Results for "${query}"`
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
              <Button variant="outline" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {[
                      filters.type !== "all",
                      !!filters.genre,
                      !!filters.year,
                      filters.minRating > 0,
                    ].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0">
              <FiltersSheet
                filters={filters}
                setFilters={setFilters}
                genres={genres}
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
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
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
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}

