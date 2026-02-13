"use client";

import { Search as SearchIcon, X, SlidersHorizontal, Image as ImageIcon } from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TMDBMovie, TMDBSeries, TMDBResponse } from "@/lib/tmdb";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTrendingMovies, useTrendingTV } from "@/hooks/use-movies";
import Image from "next/image";
import Link from "next/link";
import { FiltersSheet, type SearchFilters } from "@/components/filters/filters-sheet";
import { useWatchProviders } from "@/hooks/use-watch-providers";
import { useWatchRegions } from "@/hooks/use-watch-regions";

interface SearchResult {
  id: number;
  title: string;
  type: "movie" | "tv" | "person";
  poster_path: string | null;
  profile_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  known_for_department?: string;
}

interface SearchProps {
  hasHeroSection?: boolean;
}

export default function Search({ hasHeroSection = false }: SearchProps = {}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: "all",
    genre: [],
    year: "",
    minRating: 0,
    sortBy: "popularity.desc",
    watchProvider: undefined,
    watchRegion: "US",
  });
  const [movieGenres, setMovieGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [tvGenres, setTVGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [allGenres, setAllGenres] = useState<Array<{ id: number; name: string }>>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const [isMounted, setIsMounted] = useState(false);
  const { data: watchRegions = [] } = useWatchRegions();
  const { data: watchProviders = [] } = useWatchProviders(filters.watchRegion || "US", { all: true });

  // Check if mobile (using standard md breakpoint: 768px)
  const isMobile = useIsMobile();

  // Fetch trending content when search is expanded but query is empty
  const shouldShowTrending = isExpanded && !query.trim();
  const { data: trendingMovies = [], isLoading: isLoadingTrendingMovies } = useTrendingMovies("week", 1);
  const { data: trendingTV = [], isLoading: isLoadingTrendingTV } = useTrendingTV("week", 1);

  // Combine and limit trending content to first 10 items (mix of movies and TV)
  const trendingContent = useMemo(() => {
    if (!shouldShowTrending) return [];
    
    const combined: SearchResult[] = [];
    
    // Take first 5 movies
    const movies = trendingMovies.slice(0, 5).map((movie) => ({
      id: movie.id,
      title: movie.title,
      type: "movie" as const,
      poster_path: movie.poster_path,
      release_date: movie.release_date,
    }));
    
    // Take first 5 TV shows
    const tvShows = trendingTV.slice(0, 5).map((show) => ({
      id: show.id,
      title: show.name,
      type: "tv" as const,
      poster_path: show.poster_path,
      first_air_date: show.first_air_date,
    }));
    
    // Interleave: movie, tv, movie, tv, etc. up to 10 total
    const maxLength = Math.max(movies.length, tvShows.length);
    for (let i = 0; i < maxLength && combined.length < 10; i++) {
      if (i < movies.length) combined.push(movies[i]);
      if (i < tvShows.length && combined.length < 10) combined.push(tvShows[i]);
    }
    
    return combined;
  }, [shouldShowTrending, trendingMovies, trendingTV]);

  const isLoadingTrending = isLoadingTrendingMovies || isLoadingTrendingTV;

  // Prevent hydration mismatch by only showing content after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Fetch genres for filter dropdown
    fetch("/api/genres")
      .then((res) => res.json())
      .then((data) => {
        if (data.movie) setMovieGenres(data.movie);
        if (data.tv) setTVGenres(data.tv);
        if (data.all) setAllGenres(data.all);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === "Escape") {
        setIsExpanded(false);
        setQuery("");
        setResults([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isMobile) {
          setIsExpanded(false);
          setQuery("");
          setResults([]);
        } else {
          setIsExpanded(false);
        }
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isExpanded, isMobile]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // Search for movies/TV shows and people
      const params = new URLSearchParams({
        query: searchQuery,
        type: filters.type,
        ...(filters.genre.length > 0 && { genre: filters.genre.join(",") }),
        ...(filters.year && { year: filters.year }),
        ...(filters.minRating > 0 && { minRating: filters.minRating.toString() }),
        sortBy: filters.sortBy,
      });

      // Always search for both content and people when type is "all"
      const [contentResponse, peopleResponse] = await Promise.all([
        fetch(`/api/search?${params.toString()}`),
        fetch(`/api/search/people?query=${encodeURIComponent(searchQuery)}`),
      ]);

      const searchResults: SearchResult[] = [];

      // Add content results (movies/TV)
      const contentData: TMDBResponse<TMDBMovie | TMDBSeries> = await contentResponse.json();
      const contentResults: SearchResult[] = contentData.results.slice(0, filters.type === "all" ? 10 : 20).map((item) => ({
        id: item.id,
        title: "title" in item ? item.title : item.name,
        type: "title" in item ? "movie" : "tv",
        poster_path: item.poster_path,
        release_date: "release_date" in item ? item.release_date : undefined,
        first_air_date: "first_air_date" in item ? item.first_air_date : undefined,
      }));
      searchResults.push(...contentResults);

      // Add people results
      const peopleData = await peopleResponse.json();
      if (peopleData.results && Array.isArray(peopleData.results)) {
        const peopleResults: SearchResult[] = peopleData.results.slice(0, filters.type === "all" ? 10 : 20).map((person: { id: number; name: string; profile_path: string | null; known_for_department: string }) => ({
          id: person.id,
          title: person.name,
          type: "person" as const,
          profile_path: person.profile_path,
          known_for_department: person.known_for_department,
        }));
        searchResults.push(...peopleResults);
      }

      // Sort by relevance (you could improve this with better ranking)
      setResults(searchResults.slice(0, 20));
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      handleSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, handleSearch]);

  // Determine what to show: trending content or search results
  const displayResults = query.trim() ? results : trendingContent;
  const isShowingTrending = shouldShowTrending && !query.trim();
  const isLoadingDisplay = query.trim() ? isLoading : isLoadingTrending;

  const handleSelect = (result: SearchResult) => {
    setIsExpanded(false);
    setQuery("");
    setResults([]);
    if (result.type === "person") {
      router.push(`/person/${result.id}`);
    } else {
      router.push(`/${result.type}/${result.id}`);
    }
  };

  const handleSubmitSearch = useCallback(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    const params = new URLSearchParams();
    params.set("query", trimmedQuery);
    if (filters.type !== "all") params.set("type", filters.type);
    if (filters.genre.length > 0) params.set("genre", filters.genre.join(","));
    if (filters.year) params.set("year", filters.year);
    if (filters.minRating > 0) params.set("minRating", filters.minRating.toString());
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.watchProvider !== undefined && filters.watchProvider > 0) params.set("watchProvider", filters.watchProvider.toString());
    if (filters.watchRegion && filters.watchRegion !== "US") params.set("watchRegion", filters.watchRegion);

    router.push(`/search?${params.toString()}`);
    setIsExpanded(false);
    setResults([]);
  }, [query, filters, router]);

  const resetFilters = () => {
    setFilters({
      type: "all",
      genre: [],
      year: "",
      minRating: 0,
      sortBy: "popularity.desc",
      watchProvider: undefined,
    });
  };

  const hasActiveFilters = filters.type !== "all" || filters.genre.length > 0 || filters.year || filters.minRating > 0 || (filters.watchProvider !== undefined && filters.watchProvider > 0);

  // Don't render until mounted to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 transition-colors duration-300",
            hasHeroSection && "hover:bg-black/20 text-white"
          )}
        >
          <SearchIcon className={cn(
            "h-5 w-5 transition-colors duration-300",
            hasHeroSection && "text-white"
          )} />
        </Button>
      </div>
    );
  }

  // Mobile: Icon that expands to full-width search
  if (isMobile) {
    return (
      <div ref={containerRef} className="relative">
        {!isExpanded ? (
          <Button
            variant="ghost"
            size="icon"
              className={cn(
                "h-9 w-9 transition-colors duration-300",
                hasHeroSection && "hover:bg-black/20 text-white"
              )}
            onClick={() => {
              setIsExpanded(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
          >
            <SearchIcon className={cn(
              "size-5 transition-colors duration-300",
              hasHeroSection && "text-white"
            )} />
          </Button>
        ) : (
          <div
            className={cn(
              "fixed top-0 left-0 right-0 z-[60] bg-background border-b shadow-lg",
              "animate-in slide-in-from-top-2 duration-300"
            )}
            style={{ paddingTop: "env(safe-area-inset-top, 0)" }}
          >
            <div className="flex items-center gap-2 px-4 py-3 h-16">
              <div className="relative flex-1">
                <SearchIcon className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300",
                  hasHeroSection ? "text-white/90" : "text-muted-foreground"
                )} />
                <Input
                  ref={inputRef}
                  placeholder="Search movies, TV shows, and people..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSubmitSearch();
                    }
                  }}
                  className={cn(
                    "pl-9 pr-20 h-10 transition-colors duration-300",
                    hasHeroSection && "bg-white/10 border-[rgba(255,255,255,0.1)] text-white placeholder:text-white/80 focus:border-[rgba(255,255,255,0.2)] focus:ring-white/20"
                  )}
                  autoFocus
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 transition-colors duration-300",
                      hasHeroSection && "hover:bg-white/10 text-white"
                    )}
                    onClick={() => {
                      setQuery("");
                      setResults([]);
                    }}
                  >
                    <X className={cn(
                      "h-4 w-4 transition-colors duration-300",
                      hasHeroSection && "text-white"
                    )} />
                  </Button>
                )}
              </div>
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-10 w-10 cursor-pointer transition-colors duration-300",
                      hasHeroSection 
                        ? "hover:bg-black/20 text-white"
                        : hasActiveFilters && "bg-primary/10 text-primary"
                    )}
                  >
                    <SlidersHorizontal className={cn(
                      "h-5 w-5 transition-colors duration-300",
                      hasHeroSection && "text-white"
                    )} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="top-0 inset-x-0 h-full max-h-screen rounded-none z-[70]" overlayClassName="z-[70]">
                  <FiltersSheet
                    filters={filters}
                    setFilters={setFilters}
                    movieGenres={movieGenres}
                    tvGenres={tvGenres}
                    allGenres={allGenres}
                    watchProviders={watchProviders}
                    watchRegions={watchRegions}
                    resetFilters={resetFilters}
                    onApply={async () => {
                      setFiltersOpen(false);
                      // Build search URL with filters
                      const params = new URLSearchParams();
                      if (query.trim()) params.set("query", query.trim());
                      if (filters.type !== "all") params.set("type", filters.type);
                      if (filters.genre.length > 0) params.set("genre", filters.genre.join(","));
                      if (filters.year) params.set("year", filters.year);
                      if (filters.minRating > 0) params.set("minRating", filters.minRating.toString());
                      if (filters.sortBy) params.set("sortBy", filters.sortBy);
                      if (filters.watchProvider !== undefined && filters.watchProvider > 0) params.set("watchProvider", filters.watchProvider.toString());
                      if (filters.watchRegion && filters.watchRegion !== "US") params.set("watchRegion", filters.watchRegion);
                      
                      // Redirect to search page
                      router.push(`/search?${params.toString()}`);
                    }}
                    isLoading={isLoading}
                  />
                </SheetContent>
              </Sheet>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => {
                  setIsExpanded(false);
                  setQuery("");
                  setResults([]);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {/* Results Dropdown */}
            {(isExpanded && (query || displayResults.length > 0 || isLoadingDisplay)) && (
              <div className="h-auto overflow-hidden border-t">
                <div className="p-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
                  {isLoadingDisplay && (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-2">
                          <Skeleton className="h-12 w-8 rounded flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!isLoadingDisplay && query && results.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No results found.
                    </div>
                  )}
                  {!isLoadingDisplay && displayResults.length > 0 && (
                    <>
                      {isShowingTrending && (
                        <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Trending Now
                        </div>
                      )}
                      {displayResults.map((result) => (
                        <SearchResultItem
                          key={`${result.type}-${result.id}`}
                          result={result}
                          onSelect={handleSelect}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop: Inline search with dropdown
  return (
    <div ref={containerRef} className="relative w-72 lg:w-80 2xl:w-96">
      <div className="relative">
        <SearchIcon className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors duration-300",
          hasHeroSection ? "text-white/80" : "text-muted-foreground"
        )} />
        <Input
          ref={inputRef}
          placeholder="Search movies, TV shows, and people..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmitSearch();
            }
          }}
          onFocus={() => setIsExpanded(true)}
          className={cn(
            "pl-9 pr-20 h-9 transition-colors duration-300",
            hasHeroSection && "bg-white/10 border-[rgba(255,255,255,0.1)] text-white placeholder:text-white/60 focus:border-[rgba(255,255,255,0.2)] focus:ring-white/20"
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 transition-colors duration-300",
                hasHeroSection && "hover:bg-black/20 text-white"
              )}
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
            >
              <X className={cn(
                "h-4 w-4 transition-colors duration-300",
                hasHeroSection && "text-white"
              )} />
            </Button>
          )}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                    className={cn(
                      "h-7 w-7 cursor-pointer transition-colors duration-300",
                      hasHeroSection 
                        ? "hover:bg-black/20 text-white"
                        : hasActiveFilters && "bg-primary/10 text-primary"
                    )}
              >
                <SlidersHorizontal className={cn(
                  "h-4 w-4 transition-colors duration-300",
                  hasHeroSection && "text-white"
                )} />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[400px] sm:w-[540px] flex flex-col p-0 gap-0 top-0 inset-y-0 h-full max-h-screen z-[70]"
              overlayClassName="z-[70]"
            >
                <FiltersSheet
                  filters={filters}
                  setFilters={setFilters}
                  movieGenres={movieGenres}
                  tvGenres={tvGenres}
                  allGenres={allGenres}
                  watchProviders={watchProviders}
                  watchRegions={watchRegions}
                  resetFilters={resetFilters}
                  onApply={async () => {
                    setFiltersOpen(false);
                    // Build search URL with filters
                    const params = new URLSearchParams();
                    if (query.trim()) params.set("query", query.trim());
                    if (filters.type !== "all") params.set("type", filters.type);
                    if (filters.genre.length > 0) params.set("genre", filters.genre.join(","));
                    if (filters.year) params.set("year", filters.year);
                    if (filters.minRating > 0) params.set("minRating", filters.minRating.toString());
                    if (filters.sortBy) params.set("sortBy", filters.sortBy);
                    if (filters.watchProvider !== undefined && filters.watchProvider > 0) params.set("watchProvider", filters.watchProvider.toString());
                    if (filters.watchRegion && filters.watchRegion !== "US") params.set("watchRegion", filters.watchRegion);
                    
                    // Redirect to search page
                    router.push(`/search?${params.toString()}`);
                  }}
                  isLoading={isLoading}
                />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Results Dropdown */}
      {isExpanded && (query || displayResults.length > 0 || isLoadingDisplay) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 h-auto overflow-hidden">
          <div className="p-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {isLoadingDisplay && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2">
                    <Skeleton className="h-12 w-8 rounded flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!isLoadingDisplay && query && results.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            )}
            {!isLoadingDisplay && displayResults.length > 0 && (
              <>
                {isShowingTrending && (
                  <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Trending Now
                  </div>
                )}
                {displayResults.map((result) => (
                  <SearchResultItem
                    key={`${result.type}-${result.id}`}
                    result={result}
                    onSelect={handleSelect}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Search Result Item Component
function SearchResultItem({
  result,
  onSelect,
}: {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
}) {
  const isPerson = result.type === "person";
  const imageUrl = isPerson
    ? result.profile_path
      ? `https://image.tmdb.org/t/p/w92${result.profile_path}`
      : null
    : result.poster_path
    ? `https://image.tmdb.org/t/p/w92${result.poster_path}`
    : null;
  
  const year = isPerson
    ? null
    : result.type === "movie"
    ? result.release_date
      ? new Date(result.release_date).getFullYear()
      : "N/A"
    : result.first_air_date
    ? new Date(result.first_air_date).getFullYear()
    : "N/A";

  const subtitle = isPerson
    ? result.known_for_department || "Actor"
    : year;

  const href = isPerson ? `/person/${result.id}` : `/${result.type}/${result.id}`;

  return (
    <Link
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onSelect(result);
      }}
      className="flex items-center gap-3 w-full px-2 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={result.title}
          width={isPerson ? 32 : 32}
          height={isPerson ? 32 : 48}
          className={cn(
            "object-cover rounded flex-shrink-0",
            isPerson ? "h-8 w-8 rounded-full" : "h-12 w-8"
          )}
          unoptimized
        />
      ) : (
        <div className={cn(
          "bg-muted rounded flex items-center justify-center flex-shrink-0",
          isPerson ? "h-8 w-8 rounded-full" : "h-12 w-8"
        )}>
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{result.title}</div>
        {subtitle && (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
    </Link>
  );
}

