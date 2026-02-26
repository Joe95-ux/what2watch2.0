"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useMemo } from "react";
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
import { useProviderTypes } from "@/hooks/use-provider-types";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderButton } from "@/components/browse/provider-button";
import { ProviderBar } from "@/components/browse/provider-bar";
import { SelectServicesModal } from "@/components/browse/select-services-modal";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createContentUrl } from "@/lib/content-slug";
import { useIsMobile } from "@/hooks/use-mobile";
import { RegionDropdown } from "@/components/ui/region-dropdown";

function PopularContentInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSignedIn } = useUser();
  const { data: userPreferences } = useUserPreferences();
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [providerBarOpen, setProviderBarOpen] = useState(false);
  const [selectServicesModalOpen, setSelectServicesModalOpen] = useState(false);
  const [providerTypeFilter, setProviderTypeFilter] = useState<"all" | "my-services" | "subscriptions" | "buy-rent" | "free">("all");
  const [movieGenres, setMovieGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [tvGenres, setTVGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [allGenres, setAllGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
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
  const { data: providerTypes } = useProviderTypes(filters.watchRegion || "US");
  
  // Get user's selected providers
  const selectedProviders = userPreferences?.selectedProviders || [];
  
  // Calculate which provider to use based on provider type filter
  const getProviderForFilter = useMemo(() => {
    if (providerTypeFilter === "all") {
      return undefined;
    } else if (providerTypeFilter === "my-services") {
      // Use first selected provider, or undefined if none selected
      return selectedProviders.length > 0 ? selectedProviders[0] : undefined;
    } else if (providerTypes) {
      if (providerTypeFilter === "subscriptions") {
        const subscriptionProviders = watchProviders.filter((p) => providerTypes.flatrate.has(p.provider_id));
        return subscriptionProviders.length > 0 ? subscriptionProviders[0].provider_id : undefined;
      } else if (providerTypeFilter === "buy-rent") {
        const buyRentProviders = watchProviders.filter((p) => 
          providerTypes.buy.has(p.provider_id) || providerTypes.rent.has(p.provider_id)
        );
        return buyRentProviders.length > 0 ? buyRentProviders[0].provider_id : undefined;
      } else if (providerTypeFilter === "free") {
        const freeProviders = watchProviders.filter((p) => 
          providerTypes.free.has(p.provider_id) || providerTypes.ads.has(p.provider_id)
        );
        return freeProviders.length > 0 ? freeProviders[0].provider_id : undefined;
      }
    }
    return undefined;
  }, [providerTypeFilter, selectedProviders, providerTypes, watchProviders]);
  
  // Handle provider type filter change
  const handleProviderTypeFilterChange = (filter: "all" | "my-services" | "subscriptions" | "buy-rent" | "free") => {
    setProviderTypeFilter(filter);
    
    // Calculate which provider to use based on the new filter
    let providerId: number | undefined = undefined;
    if (filter !== "all" && providerTypes) {
      if (filter === "my-services") {
        providerId = selectedProviders.length > 0 ? selectedProviders[0] : undefined;
      } else if (filter === "subscriptions") {
        const subscriptionProviders = watchProviders.filter((p) => providerTypes.flatrate.has(p.provider_id));
        providerId = subscriptionProviders.length > 0 ? subscriptionProviders[0].provider_id : undefined;
      } else if (filter === "buy-rent") {
        const buyRentProviders = watchProviders.filter((p) => 
          providerTypes.buy.has(p.provider_id) || providerTypes.rent.has(p.provider_id)
        );
        providerId = buyRentProviders.length > 0 ? buyRentProviders[0].provider_id : undefined;
      } else if (filter === "free") {
        const freeProviders = watchProviders.filter((p) => 
          providerTypes.free.has(p.provider_id) || providerTypes.ads.has(p.provider_id)
        );
        providerId = freeProviders.length > 0 ? freeProviders[0].provider_id : undefined;
      }
    }
    
    // Update the watch provider filter
    setFilters((prev) => ({
      ...prev,
      watchProvider: providerId,
    }));
    updateURL({ watchProvider: providerId });
  };
  
  // Get providers for the provider button (first 4 selected, or first 4 available)
  const providerButtonProviders = useMemo(() => {
    if (selectedProviders.length > 0) {
      return watchProviders.filter((p) => selectedProviders.includes(p.provider_id)).slice(0, 4);
    }
    return watchProviders.slice(0, 4);
  }, [watchProviders, selectedProviders]);
  
  // Handle saving selected providers
  const handleSaveProviders = async (providerIds: number[]) => {
    try {
      const response = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedProviders: providerIds,
          favoriteGenres: userPreferences?.favoriteGenres || [],
          preferredTypes: userPreferences?.preferredTypes || [],
          onboardingCompleted: userPreferences?.onboardingCompleted ?? false,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save providers");
      }
      
      await queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      toast.success("Services saved successfully");
    } catch (error) {
      toast.error("Failed to save services");
      throw error;
    }
  };
  
  // Handle provider click in provider bar
  const handleProviderClick = (providerId: number) => {
    const newProvider = filters.watchProvider === providerId ? undefined : providerId;
    // Update the watch provider filter
    setFilters((prev) => ({
      ...prev,
      watchProvider: newProvider,
    }));
    // Update URL
    updateURL({ watchProvider: newProvider });
  };

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
  // Include provider type filter as an active filter
  const hasActiveFilters = filters.genre.length > 0 || !!filters.year || filters.minRating > 0 || (filters.watchProvider !== undefined && filters.watchProvider > 0) || providerTypeFilter !== "all";

  // Constants for pagination
  const ITEMS_PER_PAGE = 24;
  const API_ITEMS_PER_PAGE = 42;

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
  // Calculate which API page to request to get 24 items per page
  // API supports pageSize=42, which returns 42 items per page
  // For our page N, we need items (N-1)*24+1 to N*24
  // These items are in API page = Math.ceil(((N-1)*24+1) / 42)
  const apiPage = hasActiveFilters ? Math.ceil(((page - 1) * ITEMS_PER_PAGE + 1) / API_ITEMS_PER_PAGE) : page;
  
  const { data: filteredData, isLoading: isLoadingFiltered } = useSearch({
    type: hasActiveFilters ? (type === "all" ? undefined : type) : undefined,
    genre: hasActiveFilters && genre.length > 0 ? genre : undefined,
    year: hasActiveFilters && year ? year : undefined,
    minRating: hasActiveFilters && minRating > 0 ? minRating : undefined,
    sortBy: hasActiveFilters ? sortBy : undefined,
    page: apiPage,
    pageSize: hasActiveFilters ? 42 : undefined, // Request 42 items so we can slice to 24
    watchProvider: hasActiveFilters && (filters.watchProvider !== undefined && filters.watchProvider > 0) ? filters.watchProvider : (providerTypeFilter !== "all" ? getProviderForFilter : undefined),
    watchRegion: filters.watchRegion || watchRegion,
  });

  // Determine which data to use
  let results: (TMDBMovie | TMDBSeries)[] = [];
  let totalPages = 0;
  let totalResults = 0;
  let currentPage = 1;
  let isLoading = false;

  if (hasActiveFilters) {
    const filteredResults = filteredData?.results || [];
    // Slice to 24 items per page to match the "all" type behavior
    // When pageSize=42, API returns 42 items per page
    // For our page N, we need items (N-1)*24+1 to N*24 from the API response
    // Calculate which slice to take from the 42-item response
    const startIndex = ((page - 1) * ITEMS_PER_PAGE) % API_ITEMS_PER_PAGE;
    results = filteredResults.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    // Adjust total pages based on 24 items per page
    const totalFilteredResults = filteredData?.total_results || 0;
    totalPages = Math.ceil(totalFilteredResults / ITEMS_PER_PAGE);
    totalResults = totalFilteredResults;
    currentPage = page;
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
      results = combined.slice(0, 24); // Limit to 24 per page for "all"
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
      watchRegion: filters.watchRegion,
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
    const title = "title" in item ? item.title : item.name;
    router.push(createContentUrl(itemType, item.id, title || ""));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Filter Nav */}
      <div className={cn(
        "w-full bg-background/95 backdrop-blur-sm sticky top-[64px] z-30",
        providerBarOpen && isSignedIn && "border-b border-border/50"
      )}>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className={cn(
            "flex items-center justify-between py-6",
            isMobile && "flex-col gap-3 pb-0"
          )}>
            {/* Tabs */}
            <Tabs value={type === "movie" ? "movies" : type} onValueChange={(v) => handleTypeChange(v === "movies" ? "movie" : v as "all" | "movie" | "tv")} className={cn(isMobile && "self-start")}>
              <TabsList className="bg-background h-10 border border-border">
                <TabsTrigger value="all" className="cursor-pointer">All</TabsTrigger>
                <TabsTrigger value="movies" className="cursor-pointer">Movies</TabsTrigger>
                <TabsTrigger value="tv" className="cursor-pointer">TV Shows</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Provider Button and Filters Button */}
            <div className={cn("flex items-center gap-2", isMobile && "self-start")}>
              {isSignedIn && providerButtonProviders.length > 0 && (
                <ProviderButton
                  providers={providerButtonProviders}
                  onClick={() => setProviderBarOpen(!providerBarOpen)}
                />
              )}
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
        
        {/* Provider Bar */}
        {isSignedIn && (
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              providerBarOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <ProviderBar
              providers={watchProviders}
              selectedProviders={selectedProviders}
              activeProvider={filters.watchProvider}
              onProviderClick={handleProviderClick}
              onAddServices={() => setSelectServicesModalOpen(true)}
              watchRegion={filters.watchRegion || "US"}
              onFilterChange={handleProviderTypeFilterChange}
              selectedFilter={providerTypeFilter}
            />
          </div>
        )}
      </div>
      
      {/* Select Services Modal */}
      {isSignedIn && (
        <SelectServicesModal
          open={selectServicesModalOpen}
          onOpenChange={setSelectServicesModalOpen}
          providers={watchProviders}
          selectedProviders={selectedProviders}
          onSave={handleSaveProviders}
          watchRegion={filters.watchRegion || "US"}
          onRegionChange={(region) => {
            setFilters({ ...filters, watchRegion: region });
            updateURL({ watchRegion: region });
          }}
        />
      )}

      {/* Content Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(24)].map((_, i) => (
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
              <div className="flex w-full items-center justify-center gap-2 overflow-auto scrollbar-hide px-2 py-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateURL({ page: currentPage - 1 })}
                  disabled={currentPage === 1 || isLoading}
                  className="cursor-pointer sm:gap-1"
                >
                  <ChevronLeft className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
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
                  className="cursor-pointer sm:gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      </div>
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
            {[...Array(24)].map((_, i) => (
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

