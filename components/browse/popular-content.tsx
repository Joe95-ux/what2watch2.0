"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@/hooks/use-search";
import { TMDBMovie, TMDBSeries, TMDBResponse } from "@/lib/tmdb";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { MoreLikeThisCardSkeleton } from "@/components/skeletons/more-like-this-card-skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FiltersSheet, type SearchFilters } from "@/components/filters/filters-sheet";
import { useWatchProviders } from "@/hooks/use-watch-providers";
import { useWatchRegions } from "@/hooks/use-watch-regions";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { Skeleton } from "@/components/ui/skeleton";

function PopularContentInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [movieGenres, setMovieGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [tvGenres, setTVGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [allGenres, setAllGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
  const GENRES_TO_SHOW = 8;

  // Get params from URL - normalize "movies" to "movie"
  const typeParam = searchParams.get("type") || "all";
  const type = (typeParam === "movies" ? "movie" : typeParam) as "all" | "movie" | "tv";
  const genreParam = searchParams.get("genre") || "";
  const genre = genreParam ? genreParam.split(",").map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : [];
  const year = searchParams.get("year") || "";
  const minRating = searchParams.get("minRating") ? parseFloat(searchParams.get("minRating")!) : 0;
  const sortBy = searchParams.get("sortBy") || "popularity.desc";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const watchProviderParam = searchParams.get("watchProvider");
  const watchProvider = watchProviderParam ? parseInt(watchProviderParam, 10) : undefined;
  const watchRegion = searchParams.get("watchRegion") || "US";

  const [filters, setFilters] = useState<SearchFilters>({
    type,
    genre,
    year,
    minRating,
    sortBy,
    watchProvider: watchProvider !== undefined && !Number.isNaN(watchProvider) ? watchProvider : undefined,
    watchRegion,
  });

  // Update filters when URL params change
  useEffect(() => {
    const genreParam = searchParams.get("genre") || "";
    const genreArray = genreParam ? genreParam.split(",").map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : [];
    const typeParam = searchParams.get("type") || "all";
    const normalizedType = (typeParam === "movies" ? "movie" : typeParam) as "all" | "movie" | "tv";
    const wp = searchParams.get("watchProvider");
    const wpNum = wp ? parseInt(wp, 10) : undefined;
    const wr = searchParams.get("watchRegion") || "US";
    setFilters({
      type: normalizedType,
      genre: genreArray,
      year: searchParams.get("year") || "",
      minRating: searchParams.get("minRating") ? parseFloat(searchParams.get("minRating")!) : 0,
      sortBy: searchParams.get("sortBy") || "popularity.desc",
      watchProvider: wpNum != null && !Number.isNaN(wpNum) ? wpNum : undefined,
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

  // Check if we have active filters (excluding type, as type is handled by tabs)
  const hasActiveFilters = filters.genre.length > 0 || !!filters.year || filters.minRating > 0 || (filters.watchProvider !== undefined && filters.watchProvider > 0);

  // Fetch popular movies when no filters and type is movie or all
  const shouldFetchMovies = !hasActiveFilters && (type === "movie" || type === "all");
  const { data: popularMoviesData, isLoading: isLoadingPopularMovies } = useQuery<TMDBResponse<TMDBMovie>>({
    queryKey: ["popular-movies", page],
    queryFn: async () => {
      const res = await fetch(`/api/movies/popular?page=${page}`);
      if (!res.ok) throw new Error("Failed to fetch popular movies");
      return res.json();
    },
    enabled: shouldFetchMovies,
    staleTime: 1000 * 60 * 60 * 2, // 2 hours
  });

  // Fetch popular TV when no filters and type is tv or all
  const shouldFetchTV = !hasActiveFilters && (type === "tv" || type === "all");
  const { data: popularTVData, isLoading: isLoadingPopularTV } = useQuery<TMDBResponse<TMDBSeries>>({
    queryKey: ["popular-tv", page],
    queryFn: async () => {
      const res = await fetch(`/api/tv/popular?page=${page}`);
      if (!res.ok) throw new Error("Failed to fetch popular TV");
      return res.json();
    },
    enabled: shouldFetchTV,
    staleTime: 1000 * 60 * 60 * 2, // 2 hours
  });

  // Fetch filtered content when filters are active (genre, year, rating, or watch provider)
  const { data: filteredData, isLoading: isLoadingFiltered } = useSearch({
    type: hasActiveFilters ? (type === "all" ? undefined : type) : undefined,
    genre: hasActiveFilters && genre.length > 0 ? genre : undefined,
    year: hasActiveFilters && year ? year : undefined,
    minRating: hasActiveFilters && minRating > 0 ? minRating : undefined,
    sortBy: hasActiveFilters ? sortBy : undefined,
    page,
    watchProvider: hasActiveFilters && watchProvider !== undefined && !Number.isNaN(watchProvider) ? watchProvider : undefined,
    watchRegion,
  });

  // Determine which data to use
  let results: (TMDBMovie | TMDBSeries)[] = [];
  let totalPages = 0;
  let totalResults = 0;
  let currentPage = 1;
  let isLoading = false;

  if (hasActiveFilters) {
    results = filteredData?.results || [];
    totalPages = filteredData?.total_pages || 0;
    totalResults = filteredData?.total_results || 0;
    currentPage = filteredData?.page || 1;
    isLoading = isLoadingFiltered;
  } else {
    // Use popular content based on type
    if (type === "movie") {
      results = popularMoviesData?.results || [];
      totalPages = popularMoviesData?.total_pages || 0;
      totalResults = popularMoviesData?.total_results || 0;
      currentPage = popularMoviesData?.page || 1;
      isLoading = isLoadingPopularMovies;
    } else if (type === "tv") {
      results = popularTVData?.results || [];
      totalPages = popularTVData?.total_pages || 0;
      totalResults = popularTVData?.total_results || 0;
      currentPage = popularTVData?.page || 1;
      isLoading = isLoadingPopularTV;
    } else {
      // "all" - combine both (use first page of each)
      const movies = popularMoviesData?.results || [];
      const tv = popularTVData?.results || [];
      // Interleave results for better mix
      const combined: (TMDBMovie | TMDBSeries)[] = [];
      const maxLength = Math.max(movies.length, tv.length);
      for (let i = 0; i < maxLength; i++) {
        if (i < movies.length) combined.push(movies[i]);
        if (i < tv.length) combined.push(tv[i]);
      }
      results = combined.slice(0, 20); // Limit to 20 per page for "all"
      // Estimate pagination for "all" - use average of both
      const avgTotalPages = Math.max(
        popularMoviesData?.total_pages || 0,
        popularTVData?.total_pages || 0
      );
      totalPages = Math.ceil(avgTotalPages / 2); // Rough estimate
      totalResults = (popularMoviesData?.total_results || 0) + (popularTVData?.total_results || 0);
      currentPage = page;
      isLoading = isLoadingPopularMovies || isLoadingPopularTV;
    }
  }

  const updateURL = (newParams: Record<string, string | number | number[] | undefined>) => {
    const params = new URLSearchParams();
    
    // Preserve existing parameters if not being overridden
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
    if (watchProvider !== undefined && !Number.isNaN(watchProvider) && !newParams.hasOwnProperty("watchProvider")) {
      params.set("watchProvider", watchProvider.toString());
    }
    if (watchRegion && watchRegion !== "US" && !newParams.hasOwnProperty("watchRegion")) {
      params.set("watchRegion", watchRegion);
    }
    
    // Apply new parameters
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === "page") {
          params.set(key, value.toString());
        } else if (key === "genre") {
          if (Array.isArray(value) && value.length > 0) {
            params.set(key, value.join(","));
          } else if (Array.isArray(value) && value.length === 0) {
            params.delete(key);
          } else {
            params.set(key, value.toString());
          }
        } else if (key === "type") {
          if (value !== "all") {
            // Convert "movie" to "movies" for URL consistency
            const urlType = value.toString() === "movie" ? "movies" : value.toString();
            params.set(key, urlType);
          } else {
            params.delete(key);
          }
        } else if (key === "year") {
          if (value && value !== "") {
            params.set(key, value.toString());
          } else {
            params.delete(key);
          }
        } else if (key === "minRating") {
          if (value && Number(value) > 0) {
            params.set(key, value.toString());
          } else {
            params.delete(key);
          }
        } else if (key === "sortBy") {
          params.set(key, value.toString());
        } else if (key === "watchProvider") {
          if (value !== undefined && value !== null && Number(value) > 0) {
            params.set(key, value.toString());
          } else {
            params.delete(key);
          }
        } else if (key === "watchRegion") {
          if (value && value !== "US") {
            params.set(key, value.toString());
          } else {
            params.delete(key);
          }
        } else if (value && value !== "all" && value !== "" && value !== 0) {
          params.set(key, value.toString());
        }
      } else {
        params.delete(key);
      }
    });
    
    router.push(`/popular?${params.toString()}`);
  };

  const handleTypeChange = (newType: "all" | "movie" | "tv") => {
    updateURL({ type: newType, page: 1 });
  };

  const handleApplyFilters = () => {
    updateURL({
      type: filters.type,
      genre: filters.genre.length > 0 ? filters.genre : undefined,
      year: filters.year || "",
      minRating: filters.minRating > 0 ? filters.minRating : undefined,
      sortBy: filters.sortBy,
      page: 1,
      watchProvider: filters.watchProvider,
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
    });
  };

  const currentYear = new Date().getFullYear();
  const startYear = 1900;

  // Determine content type for cards
  const getContentType = (item: TMDBMovie | TMDBSeries): "movie" | "tv" => {
    return "title" in item ? "movie" : "tv";
  };

  const handleCardClick = (item: TMDBMovie | TMDBSeries, itemType: "movie" | "tv") => {
    setSelectedItem({ item, type: itemType });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Filter Nav */}
      <div className="w-full border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-[64px] z-30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Tabs */}
            <Tabs value={type === "movie" ? "movies" : type} onValueChange={(v) => handleTypeChange(v === "movies" ? "movie" : v as "all" | "movie" | "tv")}>
              <TabsList>
                <TabsTrigger value="all" className="cursor-pointer">All</TabsTrigger>
                <TabsTrigger value="movies" className="cursor-pointer">Movies</TabsTrigger>
                <TabsTrigger value="tv" className="cursor-pointer">TV Shows</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filters Button */}
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 cursor-pointer">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {[
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
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(20)].map((_, i) => (
              <MoreLikeThisCardSkeleton key={i} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-2">No results found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters
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
                  onItemClick={handleCardClick}
                  showTypeBadge={type === "all"}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex w-full items-center justify-center gap-2 overflow-auto px-2 py-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateURL({ page: currentPage - 1 })}
                  disabled={currentPage === 1 || isLoading}
                  className="cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1 overflow-auto">
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
                        className="min-w-[40px] cursor-pointer"
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
                  className="cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Content Detail Modal */}
      {selectedItem && (
        <ContentDetailModal
          item={selectedItem.item}
          type={selectedItem.type}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

export default function PopularContent() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="w-full border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-[65px] z-30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              {/* Tabs Skeleton */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-24" />
              </div>
              {/* Filters Button Skeleton */}
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(20)].map((_, i) => (
              <MoreLikeThisCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    }>
      <PopularContentInner />
    </Suspense>
  );
}

