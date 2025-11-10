"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useSearch } from "@/hooks/use-search";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface SearchFilters {
  type: "all" | "movie" | "tv";
  genre: string;
  year: string;
  minRating: number;
  sortBy: string;
}

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
    if (query) params.set("query", query);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Always include page, even if it's 1
        if (key === "page") {
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
      genre: filters.genre,
      year: filters.year,
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
            <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col">
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

// Filters Sheet Component (reused from search.tsx)
function FiltersSheet({
  filters,
  setFilters,
  genres,
  resetFilters,
  onApply,
  isLoading,
  showAllGenres,
  setShowAllGenres,
  GENRES_TO_SHOW,
  currentYear,
  startYear,
  hasActiveFilters,
}: {
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  genres: Array<{ id: number; name: string }>;
  resetFilters: () => void;
  onApply: () => void;
  isLoading?: boolean;
  showAllGenres: boolean;
  setShowAllGenres: (show: boolean) => void;
  GENRES_TO_SHOW: number;
  currentYear: number;
  startYear: number;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
        <SheetTitle className="text-xl font-semibold">Filter</SheetTitle>
        <SheetDescription className="text-sm text-muted-foreground mt-1">
          Refine your search by genre, year, rating, and more to find exactly what you&apos;re looking for.
        </SheetDescription>
      </SheetHeader>
      
      <ScrollArea className="flex-1">
        <div className="px-6 py-4 space-y-6">
          {/* Type Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold uppercase tracking-wider">Type</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="all"
                  checked={filters.type === "all"}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value as "all" | "movie" | "tv" })}
                  className="w-4 h-4"
                />
                <span className="text-sm">All</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="movie"
                  checked={filters.type === "movie"}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value as "all" | "movie" | "tv" })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Movies</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="tv"
                  checked={filters.type === "tv"}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value as "all" | "movie" | "tv" })}
                  className="w-4 h-4"
                />
                <span className="text-sm">TV Shows</span>
              </label>
            </div>
          </div>

          {/* Sort By Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold uppercase tracking-wider">Sort By</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sortBy"
                  value="popularity.desc"
                  checked={filters.sortBy === "popularity.desc"}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Popular</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sortBy"
                  value="vote_average.desc"
                  checked={filters.sortBy === "vote_average.desc"}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Highest Rated</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sortBy"
                  value="release_date.desc"
                  checked={filters.sortBy === "release_date.desc"}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Newest</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sortBy"
                  value="release_date.asc"
                  checked={filters.sortBy === "release_date.asc"}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Oldest</span>
              </label>
            </div>
          </div>

          {/* Genre Section */}
          {genres && genres.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold uppercase tracking-wider">Genre</Label>
              <div className="space-y-2">
                {(showAllGenres ? genres : genres.slice(0, GENRES_TO_SHOW)).map((genre) => (
                  <label key={genre.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.genre === genre.id.toString()}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters({ ...filters, genre: genre.id.toString() });
                        } else {
                          setFilters({ ...filters, genre: "" });
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{genre.name}</span>
                  </label>
                ))}
                {genres.length > GENRES_TO_SHOW && (
                  <button
                    onClick={() => setShowAllGenres(!showAllGenres)}
                    className="text-sm text-primary hover:underline mt-2"
                  >
                    {showAllGenres ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Release Year Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold uppercase tracking-wider">Release Year</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="From"
                value={filters.year ? filters.year.split("-")[0] : ""}
                onChange={(e) => {
                  const fromYear = e.target.value;
                  const toYear = filters.year?.includes("-") ? filters.year.split("-")[1] : "";
                  setFilters({ ...filters, year: toYear ? `${fromYear}-${toYear}` : fromYear });
                }}
                min={startYear}
                max={currentYear + 1}
                className="h-9 text-sm"
              />
              <span className="text-sm text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="To"
                value={filters.year?.includes("-") ? filters.year.split("-")[1] : filters.year || ""}
                onChange={(e) => {
                  const toYear = e.target.value;
                  const fromYear = filters.year?.includes("-") ? filters.year.split("-")[0] : filters.year || "";
                  setFilters({ ...filters, year: fromYear ? `${fromYear}-${toYear}` : toYear });
                }}
                min={startYear}
                max={currentYear + 1}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Minimum Rating Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold uppercase tracking-wider">Minimum Rating</Label>
            <div className="space-y-2">
              <Slider
                value={[filters.minRating]}
                onValueChange={([value]) => setFilters({ ...filters, minRating: value })}
                max={10}
                min={0}
                step={0.5}
                className="w-full"
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">0.0</span>
                <span className="font-semibold">{filters.minRating.toFixed(1)} / 10</span>
                <span className="text-muted-foreground">10.0</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer with Action Buttons - Fixed at bottom */}
      <div className="border-t px-6 py-4 bg-background flex-shrink-0">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={resetFilters} 
            className="flex-1 h-10 text-sm"
            disabled={!hasActiveFilters}
          >
            Reset
          </Button>
          <Button
            onClick={onApply}
            className="flex-1 h-10 text-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Applying...
              </span>
            ) : (
              "Apply"
            )}
          </Button>
        </div>
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

