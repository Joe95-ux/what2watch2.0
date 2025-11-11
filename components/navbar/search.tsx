"use client";

import { Search as SearchIcon, X, SlidersHorizontal, Image as ImageIcon } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TMDBMovie, TMDBSeries, TMDBResponse } from "@/lib/tmdb";
import { useDebounce } from "@/hooks/use-debounce";
import Image from "next/image";
import Link from "next/link";
import { FiltersSheet, type SearchFilters } from "@/components/filters/filters-sheet";

interface SearchResult {
  id: number;
  title: string;
  type: "movie" | "tv";
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
}

export default function Search() {
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
  });
  const [movieGenres, setMovieGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [tvGenres, setTVGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [allGenres, setAllGenres] = useState<Array<{ id: number; name: string }>>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Check if mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
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
      const params = new URLSearchParams({
        query: searchQuery,
        type: filters.type,
        ...(filters.genre.length > 0 && { genre: filters.genre.join(",") }),
        ...(filters.year && { year: filters.year }),
        ...(filters.minRating > 0 && { minRating: filters.minRating.toString() }),
        sortBy: filters.sortBy,
      });

      const response = await fetch(`/api/search?${params.toString()}`);
      const data: TMDBResponse<TMDBMovie | TMDBSeries> = await response.json();

      const searchResults: SearchResult[] = data.results.slice(0, 10).map((item) => ({
        id: item.id,
        title: "title" in item ? item.title : item.name,
        type: "title" in item ? "movie" : "tv",
        poster_path: item.poster_path,
        release_date: "release_date" in item ? item.release_date : undefined,
        first_air_date: "first_air_date" in item ? item.first_air_date : undefined,
      }));

      setResults(searchResults);
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

  const handleSelect = (result: SearchResult) => {
    setIsExpanded(false);
    setQuery("");
    setResults([]);
    router.push(`/${result.type}/${result.id}`);
  };

  const resetFilters = () => {
    setFilters({
      type: "all",
      genre: [],
      year: "",
      minRating: 0,
      sortBy: "popularity.desc",
    });
  };

  const hasActiveFilters = filters.type !== "all" || filters.genre.length > 0 || filters.year || filters.minRating > 0;

  // Mobile: Icon that expands to full-width search
  if (isMobile) {
    return (
      <div ref={containerRef} className="relative">
        {!isExpanded ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => {
              setIsExpanded(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
          >
            <SearchIcon className="h-5 w-5" />
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
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Search movies and TV shows..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 pr-20 h-10"
                  autoFocus
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => {
                      setQuery("");
                      setResults([]);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-10 w-10 cursor-pointer",
                      hasActiveFilters && "bg-primary/10 text-primary"
                    )}
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh]">
                  <FiltersSheet
                    filters={filters}
                    setFilters={setFilters}
                    movieGenres={movieGenres}
                    tvGenres={tvGenres}
                    allGenres={allGenres}
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
            {(query || results.length > 0) && (
              <div className="max-h-[60vh] overflow-y-auto border-t">
                {isLoading && (
                  <div className="p-2 space-y-3">
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
                {!isLoading && query && results.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No results found.
                  </div>
                )}
                {!isLoading && results.length > 0 && (
                  <div className="p-2">
                    {results.map((result) => (
                      <SearchResultItem
                        key={`${result.type}-${result.id}`}
                        result={result}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop: Inline search with dropdown
  return (
    <div ref={containerRef} className="relative w-64 lg:w-80">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder="Search movies and TV shows..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          className="pl-9 pr-20 h-9"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 cursor-pointer",
                  hasActiveFilters && "bg-primary/10 text-primary"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <FiltersSheet
                  filters={filters}
                  setFilters={setFilters}
                  genres={genres}
                  resetFilters={resetFilters}
                  onApply={async () => {
                    setFiltersOpen(false);
                    // Build search URL with filters
                    const params = new URLSearchParams();
                    if (query.trim()) params.set("query", query.trim());
                    if (filters.type !== "all") params.set("type", filters.type);
                    if (filters.genre) params.set("genre", filters.genre);
                    if (filters.year) params.set("year", filters.year);
                    if (filters.minRating > 0) params.set("minRating", filters.minRating.toString());
                    if (filters.sortBy) params.set("sortBy", filters.sortBy);
                    
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
      {isExpanded && (query || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {isLoading && (
            <div className="p-2 space-y-3">
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
          {!isLoading && query && results.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          )}
          {!isLoading && results.length > 0 && (
            <div className="p-2">
              {results.map((result) => (
                <SearchResultItem
                  key={`${result.type}-${result.id}`}
                  result={result}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
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
  const posterUrl = result.poster_path
    ? `https://image.tmdb.org/t/p/w92${result.poster_path}`
    : null;
  const year =
    result.type === "movie"
      ? result.release_date
        ? new Date(result.release_date).getFullYear()
        : "N/A"
      : result.first_air_date
      ? new Date(result.first_air_date).getFullYear()
      : "N/A";

  return (
    <Link
      href={`/${result.type}/${result.id}`}
      onClick={(e) => {
        e.preventDefault();
        onSelect(result);
      }}
      className="flex items-center gap-3 w-full px-2 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
    >
      {posterUrl ? (
        <Image
          src={posterUrl}
          alt={result.title}
          width={32}
          height={48}
          className="h-12 w-8 object-cover rounded flex-shrink-0"
          unoptimized
        />
      ) : (
        <div className="h-12 w-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{result.title}</div>
        <div className="text-xs text-muted-foreground">{year}</div>
      </div>
    </Link>
  );
}

