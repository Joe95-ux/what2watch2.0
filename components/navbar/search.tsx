"use client";

import { Search as SearchIcon, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TMDBMovie, TMDBSeries, TMDBResponse } from "@/lib/tmdb";

interface SearchResult {
  id: number;
  title: string;
  type: "movie" | "tv";
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
}

export default function Search() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const [moviesRes, tvRes] = await Promise.all([
        fetch(`/api/search?query=${encodeURIComponent(searchQuery)}&type=movie`),
        fetch(`/api/search?query=${encodeURIComponent(searchQuery)}&type=tv`),
      ]);

      const moviesData: TMDBResponse<TMDBMovie> = moviesRes.ok 
        ? await moviesRes.json() 
        : { results: [], page: 1, total_pages: 0, total_results: 0 };
      const tvData: TMDBResponse<TMDBSeries> = tvRes.ok 
        ? await tvRes.json() 
        : { results: [], page: 1, total_pages: 0, total_results: 0 };

      const combined: SearchResult[] = [
        ...moviesData.results.slice(0, 5).map((m: TMDBMovie) => ({
          id: m.id,
          title: m.title,
          type: "movie" as const,
          poster_path: m.poster_path,
          release_date: m.release_date,
        })),
        ...tvData.results.slice(0, 5).map((t: TMDBSeries) => ({
          id: t.id,
          title: t.name,
          type: "tv" as const,
          poster_path: t.poster_path,
          first_air_date: t.first_air_date,
        })),
      ];

      setResults(combined);
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

  return (
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
      <PopoverContent className="w-[80vw] p-0 sm:w-[400px] md:w-[500px]" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              ref={inputRef}
              placeholder="Search movies and TV shows..."
              value={query}
              onValueChange={(value) => {
                setQuery(value);
                handleSearch(value);
              }}
            />
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
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {!isLoading && query && results.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {!isLoading && results.length > 0 && (
              <>
                <CommandGroup heading="Movies">
                  {results
                    .filter((r) => r.type === "movie")
                    .map((result) => (
                      <CommandItem
                        key={`movie-${result.id}`}
                        value={result.title}
                        onSelect={() => handleSelect(result)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-3 w-full">
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
                            {result.release_date && (
                              <div className="text-xs text-muted-foreground">
                                {new Date(result.release_date).getFullYear()}
                              </div>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
                <CommandGroup heading="TV Shows">
                  {results
                    .filter((r) => r.type === "tv")
                    .map((result) => (
                      <CommandItem
                        key={`tv-${result.id}`}
                        value={result.title}
                        onSelect={() => handleSelect(result)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-3 w-full">
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
                            {result.first_air_date && (
                              <div className="text-xs text-muted-foreground">
                                {new Date(result.first_air_date).getFullYear()}
                              </div>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
