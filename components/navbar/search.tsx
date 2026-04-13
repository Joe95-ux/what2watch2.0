"use client";

import { Search as SearchIcon, X, SlidersHorizontal, Image as ImageIcon } from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  TMDBMovie,
  TMDBSeries,
  TMDBResponse,
  TMDBTrendingAllItem,
  getPosterUrl,
} from "@/lib/tmdb";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useTrendingAll,
  useTrendingMovies,
  useTrendingTV,
} from "@/hooks/use-movies";
import Image from "next/image";
import Link from "next/link";
import { createContentUrl } from "@/lib/content-slug";
import { FiltersSheet, type SearchFilters } from "@/components/filters/filters-sheet";
import { useWatchProviders } from "@/hooks/use-watch-providers";
import { useWatchRegions } from "@/hooks/use-watch-regions";
import { format } from "date-fns";

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

type SearchTrendingTab = "trending" | "today" | "week";

function interleaveTrendingMoviesAndTV(
  movies: TMDBMovie[],
  tvShows: TMDBSeries[],
  limit = 10
): SearchResult[] {
  const movieResults: SearchResult[] = movies.slice(0, 5).map((movie) => ({
    id: movie.id,
    title: movie.title,
    type: "movie" as const,
    poster_path: movie.poster_path,
    release_date: movie.release_date,
  }));
  const tvResults: SearchResult[] = tvShows.slice(0, 5).map((show) => ({
    id: show.id,
    title: show.name,
    type: "tv" as const,
    poster_path: show.poster_path,
    first_air_date: show.first_air_date,
  }));
  const combined: SearchResult[] = [];
  const maxLength = Math.max(movieResults.length, tvResults.length);
  for (let i = 0; i < maxLength && combined.length < limit; i++) {
    if (i < movieResults.length) combined.push(movieResults[i]);
    if (i < tvResults.length && combined.length < limit) combined.push(tvResults[i]);
  }
  return combined;
}

function mapTrendingAllToSearchResults(
  items: TMDBTrendingAllItem[],
  limit = 10
): SearchResult[] {
  const out: SearchResult[] = [];
  for (const item of items) {
    if (out.length >= limit) break;
    if (item.media_type === "movie") {
      out.push({
        id: item.id,
        title: item.title,
        type: "movie",
        poster_path: item.poster_path,
        release_date: item.release_date,
      });
    } else if (item.media_type === "tv") {
      out.push({
        id: item.id,
        title: item.name,
        type: "tv",
        poster_path: item.poster_path,
        first_air_date: item.first_air_date,
      });
    } else if (item.media_type === "person") {
      out.push({
        id: item.id,
        title: item.name,
        type: "person",
        poster_path: null,
        profile_path: item.profile_path,
        known_for_department: item.known_for_department,
      });
    }
  }
  return out;
}

const SEARCH_TRENDING_TABS: { id: SearchTrendingTab; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
];

interface SearchProps {
  hasHeroSection?: boolean;
  /** When true, search bar is in navbar center with wider max-width */
  centered?: boolean;
}

export default function Search({ hasHeroSection = false, centered = false }: SearchProps = {}) {
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
  const [trendingTab, setTrendingTab] = useState<SearchTrendingTab>("today");

  // Fetch trending content when search is expanded but query is empty
  const shouldShowTrending = isExpanded && !query.trim();
  const showTrendingAllTab = shouldShowTrending && trendingTab === "trending";
  const showTodayTab = shouldShowTrending && trendingTab === "today";
  const showWeekTab = shouldShowTrending && trendingTab === "week";

  const { data: trendingMoviesDay = [], isLoading: loadingMoviesDay } =
    useTrendingMovies("day", 1, { enabled: showTodayTab });
  const { data: trendingTVDay = [], isLoading: loadingTVDay } = useTrendingTV(
    "day",
    1,
    { enabled: showTodayTab }
  );
  const { data: trendingMoviesWeek = [], isLoading: loadingMoviesWeek } =
    useTrendingMovies("week", 1, { enabled: showWeekTab });
  const { data: trendingTVWeek = [], isLoading: loadingTVWeek } = useTrendingTV(
    "week",
    1,
    { enabled: showWeekTab }
  );
  const { data: trendingAllItems = [], isLoading: loadingTrendingAll } =
    useTrendingAll("day", 1, { enabled: showTrendingAllTab });

  const trendingContent = useMemo(() => {
    if (!shouldShowTrending) return [];
    if (trendingTab === "trending") {
      return mapTrendingAllToSearchResults(trendingAllItems);
    }
    if (trendingTab === "today") {
      return interleaveTrendingMoviesAndTV(trendingMoviesDay, trendingTVDay);
    }
    return interleaveTrendingMoviesAndTV(trendingMoviesWeek, trendingTVWeek);
  }, [
    shouldShowTrending,
    trendingTab,
    trendingAllItems,
    trendingMoviesDay,
    trendingTVDay,
    trendingMoviesWeek,
    trendingTVWeek,
  ]);

  const isLoadingTrending =
    shouldShowTrending &&
    (trendingTab === "today"
      ? loadingMoviesDay || loadingTVDay
      : trendingTab === "week"
        ? loadingMoviesWeek || loadingTVWeek
        : loadingTrendingAll);

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
    } else if (result.type === "movie") {
      router.push(createContentUrl("movie", result.id, result.title));
    } else {
      router.push(createContentUrl("tv", result.id, result.title));
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
              "fixed left-0 right-0 z-[60] flex flex-col min-h-0",
              hasHeroSection
                ? "bg-zinc-950 text-zinc-50 border-b border-white/10"
                : "bg-background border-b shadow-lg",
              filtersOpen ? "top-0 bottom-0 h-[100dvh] sm:h-screen" : "top-0",
              "animate-in slide-in-from-top-2 duration-300"
            )}
            style={{ paddingTop: "env(safe-area-inset-top, 0)" }}
          >
            {filtersOpen ? (
              <>
                <div
                  className={cn(
                    "flex-shrink-0 flex items-center justify-end px-4 h-14 border-b",
                    hasHeroSection && "border-white/10"
                  )}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-10 w-10", hasHeroSection && "text-zinc-200 hover:bg-white/10 hover:text-white")}
                    onClick={() => setFiltersOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <FiltersSheet
                    inline
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
                      const params = new URLSearchParams();
                      if (query.trim()) params.set("query", query.trim());
                      if (filters.type !== "all") params.set("type", filters.type);
                      if (filters.genre.length > 0) params.set("genre", filters.genre.join(","));
                      if (filters.year) params.set("year", filters.year);
                      if (filters.minRating > 0) params.set("minRating", filters.minRating.toString());
                      if (filters.sortBy) params.set("sortBy", filters.sortBy);
                      if (filters.watchProvider !== undefined && filters.watchProvider > 0) params.set("watchProvider", filters.watchProvider.toString());
                      if (filters.watchRegion && filters.watchRegion !== "US") params.set("watchRegion", filters.watchRegion);
                      router.push(`/search?${params.toString()}`);
                    }}
                    isLoading={isLoading}
                  />
                </div>
              </>
            ) : (
              <>
            <div
              className={cn(
                "flex-shrink-0 border-b",
                hasHeroSection && "border-white/10"
              )}
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
                    hasHeroSection && "bg-transparent border-[rgba(255,255,255,0.1)] text-white placeholder:text-white/80 focus:border-[rgba(255,255,255,0.2)] focus:ring-white/20"
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
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 cursor-pointer transition-colors duration-300",
                  hasHeroSection 
                    ? "hover:bg-black/20 text-white"
                    : hasActiveFilters && "bg-primary/10 text-primary"
                )}
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal className={cn(
                  "h-5 w-5 transition-colors duration-300",
                  hasHeroSection && "text-white"
                )} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-10 w-10", hasHeroSection && "text-zinc-200 hover:bg-white/10 hover:text-white")}
                onClick={() => {
                  setIsExpanded(false);
                  setQuery("");
                  setResults([]);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            </div>
            {/* Results Dropdown */}
            {(isExpanded && (query || displayResults.length > 0 || isLoadingDisplay)) && (
              <div
                className={cn(
                  "h-auto overflow-hidden border-t",
                  hasHeroSection && "border-white/10 bg-zinc-950"
                )}
              >
                <div className="p-2 max-h-[80vh] sm:max-h-[60vh] overflow-y-auto scrollbar-thin">
                  {isLoadingDisplay && (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "relative flex rounded-lg border overflow-hidden px-2 py-2",
                            hasHeroSection ? "border-white/10 bg-white/[0.03]" : "border-border"
                          )}
                        >
                          <Skeleton
                            className={cn(
                              "h-12 w-8 rounded-l-lg flex-shrink-0",
                              hasHeroSection && "bg-white/10"
                            )}
                          />
                          <div className="flex-1 min-w-0 flex flex-col gap-1 px-3">
                            <Skeleton className={cn("h-4 w-3/4", hasHeroSection && "bg-white/10")} />
                            <Skeleton className={cn("h-3.5 w-1/2", hasHeroSection && "bg-white/10")} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!isLoadingDisplay && query && results.length === 0 && (
                    <div
                      className={cn(
                        "py-6 text-center text-sm",
                        hasHeroSection ? "text-zinc-400" : "text-muted-foreground"
                      )}
                    >
                      No results found.
                    </div>
                  )}
                  {!isLoadingDisplay && displayResults.length > 0 && (
                    <>
                      {isShowingTrending && (
                        <div className="px-2 pt-1 pb-3">
                          <span
                            className={cn(
                              "flex flex-wrap items-center gap-0.5 text-xs",
                              hasHeroSection ? "text-zinc-500" : "text-muted-foreground"
                            )}
                          >
                            {SEARCH_TRENDING_TABS.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setTrendingTab(t.id)}
                                className={cn(
                                  "px-1.5 py-0.5 rounded cursor-pointer transition-colors",
                                  hasHeroSection
                                    ? trendingTab === t.id
                                      ? "bg-white/15 font-medium text-white"
                                      : "hover:text-zinc-200"
                                    : trendingTab === t.id
                                      ? "bg-muted font-medium text-foreground"
                                      : "hover:text-foreground"
                                )}
                              >
                                {t.label}
                              </button>
                            ))}
                          </span>
                        </div>
                      )}
                      <div className="space-y-4">
                        {displayResults.map((result) => (
                          <SearchResultItem
                            key={`${result.type}-${result.id}`}
                            result={result}
                            onSelect={handleSelect}
                            hasHeroSection={hasHeroSection}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop: Inline search with dropdown
  return (
    <div
      ref={containerRef}
      className={cn(
        "relative",
        centered ? "w-full max-w-[28rem] min-w-0" : "w-72 lg:w-80 2xl:w-96"
      )}
    >
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
            "pl-9 pr-20 h-10 transition-colors duration-300",
            hasHeroSection && "bg-transparent border-[rgba(255,255,255,0.1)] text-white placeholder:text-white/60 focus:border-[rgba(255,255,255,0.2)] focus:ring-white/20"
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
              className="w-[400px] sm:w-[540px] flex flex-col p-0 gap-0 top-0 inset-y-0 h-full max-h-screen"
              forceAbove
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
        <div
          className={cn(
            "absolute top-full left-0 right-0 mt-1 rounded-md shadow-lg z-[60] h-auto overflow-hidden border",
            hasHeroSection
              ? "bg-zinc-950 border-white/10 text-zinc-50 shadow-xl shadow-black/40"
              : "bg-background border-border"
          )}
        >
          <div className="p-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {isLoadingDisplay && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "relative flex rounded-lg border overflow-hidden px-2 py-2",
                      hasHeroSection ? "border-white/10 bg-white/[0.03]" : "border-border"
                    )}
                  >
                    <Skeleton
                      className={cn(
                        "h-16 w-11 rounded-l-lg flex-shrink-0",
                        hasHeroSection && "bg-white/10"
                      )}
                    />
                    <div className="flex-1 min-w-0 flex flex-col gap-1 px-3">
                      <Skeleton className={cn("h-4 w-3/4", hasHeroSection && "bg-white/10")} />
                      <Skeleton className={cn("h-3.5 w-1/2", hasHeroSection && "bg-white/10")} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!isLoadingDisplay && query && results.length === 0 && (
              <div
                className={cn(
                  "py-6 text-center text-sm",
                  hasHeroSection ? "text-zinc-400" : "text-muted-foreground"
                )}
              >
                No results found.
              </div>
            )}
            {!isLoadingDisplay && displayResults.length > 0 && (
              <>
                {isShowingTrending && (
                  <div className="px-2 pt-1 pb-3">
                    <span
                      className={cn(
                        "flex flex-wrap items-center gap-0.5 text-xs",
                        hasHeroSection ? "text-zinc-500" : "text-muted-foreground"
                      )}
                    >
                      {SEARCH_TRENDING_TABS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTrendingTab(t.id)}
                          className={cn(
                            "px-1.5 py-0.5 rounded cursor-pointer transition-colors",
                            hasHeroSection
                              ? trendingTab === t.id
                                ? "bg-white/15 font-medium text-white"
                                : "hover:text-zinc-200"
                              : trendingTab === t.id
                                ? "bg-muted font-medium text-foreground"
                                : "hover:text-foreground"
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </span>
                  </div>
                )}
                <div className="space-y-4">
                  {displayResults.map((result) => (
                    <SearchResultItem
                      key={`${result.type}-${result.id}`}
                      result={result}
                      onSelect={handleSelect}
                      variant="desktop"
                      hasHeroSection={hasHeroSection}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Search Result Item Component - Matches episode card design
function SearchResultItem({
  result,
  onSelect,
  variant = "mobile",
  hasHeroSection = false,
}: {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
  variant?: "mobile" | "desktop";
  hasHeroSection?: boolean;
}) {
  const isPerson = result.type === "person";
  const imageUrl = isPerson
    ? result.profile_path
      ? getPosterUrl(result.profile_path, "w300")
      : null
    : result.poster_path
    ? getPosterUrl(result.poster_path, "w300")
    : null;

  // Format release date
  const releaseDate = isPerson
    ? null
    : result.type === "movie"
    ? result.release_date
    : result.first_air_date;

  const formattedDate = releaseDate
    ? format(new Date(releaseDate), "MMM d, yyyy")
    : null;

  const typeTag = isPerson
    ? result.known_for_department || "Actor"
    : result.type === "movie"
    ? "Movie"
    : "TV Show";

  const href = isPerson
    ? `/person/${result.id}`
    : result.type === "movie"
      ? createContentUrl("movie", result.id, result.title)
      : createContentUrl("tv", result.id, result.title);

  const posterClass = variant === "desktop"
    ? isPerson
      ? "h-10 w-10 rounded-full"
      : "h-16 w-11"
    : isPerson
    ? "h-8 w-8 rounded-full"
    : "h-12 w-8";

  return (
    <Link
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onSelect(result);
      }}
      className={cn(
        "relative flex rounded-lg border transition-all group cursor-pointer overflow-hidden px-2 py-2",
        hasHeroSection
          ? "border-white/10 bg-white/[0.04] hover:border-primary/60 hover:bg-white/[0.08]"
          : "border-border hover:border-primary/50"
      )}
    >
      {imageUrl ? (
        <div
          className={cn(
            "relative rounded-l-lg overflow-hidden flex-shrink-0",
            isPerson ? "rounded-full" : "",
            posterClass,
            hasHeroSection ? "bg-white/10" : "bg-muted"
          )}
        >
          <Image
            src={imageUrl}
            alt={result.title}
            width={variant === "desktop" ? (isPerson ? 40 : 44) : 32}
            height={variant === "desktop" ? (isPerson ? 40 : 64) : isPerson ? 32 : 48}
            className={cn("object-cover", isPerson ? "rounded-full" : "rounded-l-lg")}
            unoptimized
          />
        </div>
      ) : (
        <div
          className={cn(
            "rounded flex items-center justify-center flex-shrink-0",
            isPerson ? "rounded-full" : "rounded-l-lg",
            posterClass,
            hasHeroSection ? "bg-white/10" : "bg-muted"
          )}
        >
          <ImageIcon
            className={cn("h-4 w-4", hasHeroSection ? "text-zinc-500" : "text-muted-foreground")}
          />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-1 px-3">
        <div
          className={cn(
            "text-sm font-medium truncate transition-colors",
            hasHeroSection ? "text-zinc-100 group-hover:text-white" : ""
          )}
        >
          {result.title}
        </div>
        <div
          className={cn(
            "flex items-center gap-2 text-[13px] flex-wrap",
            hasHeroSection ? "text-zinc-400" : "text-muted-foreground"
          )}
        >
          {formattedDate && (
            <span>{formattedDate}</span>
          )}
          {formattedDate && (
            <span>•</span>
          )}
          <Badge
            variant="secondary"
            className={cn(
              "text-[13px] font-normal py-0 rounded-[4px]",
              hasHeroSection &&
                "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
            )}
          >
            {typeTag}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

