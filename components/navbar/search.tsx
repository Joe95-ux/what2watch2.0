"use client";

import { Search as SearchIcon, X, Filter, SlidersHorizontal } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TMDBMovie, TMDBSeries, TMDBResponse } from "@/lib/tmdb";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchResult {
  id: number;
  title: string;
  type: "movie" | "tv";
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
}

interface SearchFilters {
  type: "all" | "movie" | "tv";
  genre: string;
  year: string;
  minRating: number;
  sortBy: string;
}

export default function Search() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: "all",
    genre: "",
    year: "",
    minRating: 0,
    sortBy: "popularity.desc",
  });
  const [genres, setGenres] = useState<Array<{ id: number; name: string }>>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    // Fetch genres for filter dropdown
    fetch("/api/genres")
      .then((res) => res.json())
      .then((data) => {
        if (data.all) {
          setGenres(data.all);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      handleSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, filters]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        query: searchQuery,
        type: filters.type,
        ...(filters.genre && { genre: filters.genre }),
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
  };

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    router.push(`/${result.type}/${result.id}`);
  };

  const resetFilters = () => {
    setFilters({
      type: "all",
      genre: "",
      year: "",
      minRating: 0,
      sortBy: "popularity.desc",
    });
  };

  const hasActiveFilters = filters.type !== "all" || filters.genre || filters.year || filters.minRating > 0;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "relative h-9 w-full justify-start rounded-md border bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-64 lg:w-80"
            )}
          >
            <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <span className="hidden lg:inline-flex">Search movies and TV shows...</span>
            <span className="inline-flex lg:hidden">Search...</span>
            <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[80vw] p-0 sm:w-[500px] md:w-[600px]" align="start">
          <div className="flex items-center border-b px-3 py-2 gap-2">
            <SearchIcon className="h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={inputRef}
              placeholder="Search movies and TV shows..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
            />
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    hasActiveFilters && "bg-primary/10 text-primary"
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Advanced Filters</SheetTitle>
                  <SheetDescription>
                    Refine your search with advanced filters
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div>
                    <Label>Content Type</Label>
                    <Select
                      value={filters.type}
                      onValueChange={(value) =>
                        setFilters({ ...filters, type: value as "all" | "movie" | "tv" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="movie">Movies</SelectItem>
                        <SelectItem value="tv">TV Shows</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Genre</Label>
                    <Select
                      value={filters.genre}
                      onValueChange={(value) =>
                        setFilters({ ...filters, genre: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Genres</SelectItem>
                        {genres.map((genre) => (
                          <SelectItem key={genre.id} value={genre.id.toString()}>
                            {genre.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Minimum Rating</Label>
                    <div className="mt-2">
                      <Slider
                        value={[filters.minRating]}
                        onValueChange={([value]) =>
                          setFilters({ ...filters, minRating: value })
                        }
                        max={10}
                        min={0}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0</span>
                        <span className="font-medium">{filters.minRating}</span>
                        <span>10</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Release Year</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 2020"
                      value={filters.year}
                      onChange={(e) =>
                        setFilters({ ...filters, year: e.target.value })
                      }
                      min="1900"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>

                  <div>
                    <Label>Sort By</Label>
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value) =>
                        setFilters({ ...filters, sortBy: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="popularity.desc">Popularity</SelectItem>
                        <SelectItem value="vote_average.desc">Rating</SelectItem>
                        <SelectItem value="release_date.desc">Release Date (Newest)</SelectItem>
                        <SelectItem value="release_date.asc">Release Date (Oldest)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={resetFilters}
                      className="flex-1"
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={() => setFiltersOpen(false)}
                      className="flex-1 bg-gradient-to-r from-[#066f72] to-[#0d9488] hover:from-[#055a5d] hover:to-[#0a7a6e] text-white"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
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
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
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
                  <div
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="flex items-center gap-3 w-full px-2 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                  >
                    {result.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                        alt={result.title}
                        className="h-12 w-8 object-cover rounded"
                      />
                    ) : (
                      <div className="h-12 w-8 bg-muted rounded flex items-center justify-center">
                        <span className="text-xs">No Image</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{result.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {result.type === "movie"
                          ? result.release_date
                            ? new Date(result.release_date).getFullYear()
                            : "N/A"
                          : result.first_air_date
                          ? new Date(result.first_air_date).getFullYear()
                          : "N/A"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

