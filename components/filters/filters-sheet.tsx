"use client";

import { useState } from "react";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCountryFlagEmoji } from "@/hooks/use-watch-regions";

export interface SearchFilters {
  type: "all" | "movie" | "tv";
  genre: number[]; // Changed to array for multiple selection
  year: string;
  minRating: number;
  sortBy: string;
  watchProvider?: number;
  watchRegion?: string;
}

export interface WatchProviderOption {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

export interface WatchRegionOption {
  iso_3166_1: string;
  english_name: string;
}

interface FiltersSheetProps {
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  movieGenres: Array<{ id: number; name: string }>;
  tvGenres: Array<{ id: number; name: string }>;
  allGenres: Array<{ id: number; name: string }>;
  watchProviders?: WatchProviderOption[];
  watchRegions?: WatchRegionOption[];
  resetFilters: () => void;
  onApply: () => void;
  isLoading?: boolean;
  showAllGenres?: boolean;
  setShowAllGenres?: (show: boolean) => void;
  GENRES_TO_SHOW?: number;
  currentYear?: number;
  startYear?: number;
  hasActiveFilters?: boolean;
}

export function FiltersSheet({
  filters,
  setFilters,
  movieGenres,
  tvGenres,
  allGenres,
  resetFilters,
  onApply,
  isLoading,
  showAllGenres: externalShowAllGenres,
  setShowAllGenres: externalSetShowAllGenres,
  GENRES_TO_SHOW = 8,
  watchProviders = [],
  watchRegions = [],
  currentYear: externalCurrentYear,
  startYear: externalStartYear,
  hasActiveFilters: externalHasActiveFilters,
}: FiltersSheetProps) {
  // Internal state if not provided externally
  const [internalShowAllGenres, setInternalShowAllGenres] = useState(false);
  const showAllGenres = externalShowAllGenres ?? internalShowAllGenres;
  const setShowAllGenres = externalSetShowAllGenres ?? setInternalShowAllGenres;
  const [showAllWatchProviders, setShowAllWatchProviders] = useState(false);
  const WATCH_PROVIDERS_TO_SHOW = 10;
  const watchProvidersToShow = showAllWatchProviders ? watchProviders : watchProviders.slice(0, WATCH_PROVIDERS_TO_SHOW);
  const hasMoreWatchProviders = watchProviders.length > WATCH_PROVIDERS_TO_SHOW;
  
  const currentYear = externalCurrentYear ?? new Date().getFullYear();
  const startYear = externalStartYear ?? 1900;
  
  // Get the appropriate genres based on selected type
  const genresToShow = filters.type === "movie" 
    ? movieGenres 
    : filters.type === "tv" 
    ? tvGenres 
    : allGenres;
  
  const watchRegion = filters.watchRegion || "US";

  const hasActiveFilters = externalHasActiveFilters ?? (
    filters.type !== "all" || 
    filters.genre.length > 0 || 
    filters.year || 
    filters.minRating > 0 ||
    (filters.watchProvider !== undefined && filters.watchProvider > 0)
  );

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
        <SheetTitle className="text-xl font-semibold">Filter</SheetTitle>
        <SheetDescription className="text-sm text-muted-foreground mt-1">
          Refine your search by genre, year, rating, and more to find exactly what you&apos;re looking for.
        </SheetDescription>
      </SheetHeader>
      
      <ScrollArea className="flex-1 max-h-[calc(100vh-180px)]">
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
                  onChange={(e) => {
                    const newType = e.target.value as "all" | "movie" | "tv";
                    // Get valid genre IDs for the new type
                    const validGenres = newType === "movie" 
                      ? movieGenres.map(g => g.id)
                      : newType === "tv"
                      ? tvGenres.map(g => g.id)
                      : allGenres.map(g => g.id);
                    // Filter out invalid genres
                    const validSelectedGenres = filters.genre.filter(id => validGenres.includes(id));
                    setFilters({ ...filters, type: newType, genre: validSelectedGenres });
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">All</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="movie"
                  checked={filters.type === "movie"}
                  onChange={(e) => {
                    const newType = e.target.value as "all" | "movie" | "tv";
                    // Get valid genre IDs for the new type
                    const validGenres = newType === "movie" 
                      ? movieGenres.map(g => g.id)
                      : newType === "tv"
                      ? tvGenres.map(g => g.id)
                      : allGenres.map(g => g.id);
                    // Filter out invalid genres
                    const validSelectedGenres = filters.genre.filter(id => validGenres.includes(id));
                    setFilters({ ...filters, type: newType, genre: validSelectedGenres });
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Movies</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="tv"
                  checked={filters.type === "tv"}
                  onChange={(e) => {
                    const newType = e.target.value as "all" | "movie" | "tv";
                    // Get valid genre IDs for the new type
                    const validGenres = newType === "movie" 
                      ? movieGenres.map(g => g.id)
                      : newType === "tv"
                      ? tvGenres.map(g => g.id)
                      : allGenres.map(g => g.id);
                    // Filter out invalid genres
                    const validSelectedGenres = filters.genre.filter(id => validGenres.includes(id));
                    setFilters({ ...filters, type: newType, genre: validSelectedGenres });
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">TV Shows</span>
              </label>
            </div>
          </div>

          {/* Where to Watch Section */}
          {(watchRegions.length > 0 || watchProviders.length > 0) && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold uppercase tracking-wider">Where to Watch</Label>
              {watchRegions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span>{getCountryFlagEmoji(watchRegion)}</span>
                        <span>{watchRegions.find((r) => r.iso_3166_1 === watchRegion)?.english_name ?? watchRegion}</span>
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-[min(60vh,400px)] overflow-y-auto">
                    {watchRegions.map((region) => {
                      const isSelected = watchRegion === region.iso_3166_1;
                      return (
                        <DropdownMenuItem
                          key={region.iso_3166_1}
                          onClick={() => setFilters({ ...filters, watchRegion: region.iso_3166_1 })}
                          className="cursor-pointer flex items-center gap-2"
                        >
                          <span className="text-lg">{getCountryFlagEmoji(region.iso_3166_1)}</span>
                          <span className="flex-1">{region.english_name}</span>
                          {isSelected && <Check className="h-4 w-4 shrink-0" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {watchProviders.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, watchProvider: undefined })}
                    className={cn(
                      "cursor-pointer rounded-lg border p-2 h-10 transition-colors flex items-center gap-2",
                      (filters.watchProvider === undefined || filters.watchProvider === 0)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent border-input"
                    )}
                  >
                    <span className="text-sm font-medium">Any</span>
                  </button>
                  {watchProvidersToShow.map((provider) => {
                    const isSelected = filters.watchProvider === provider.provider_id;
                    return (
                      <button
                        key={provider.provider_id}
                        type="button"
                        onClick={() => setFilters({ ...filters, watchProvider: provider.provider_id })}
                        title={provider.provider_name}
                        className={cn(
                          "cursor-pointer rounded-lg border p-0 h-10 w-10 transition-colors flex items-center justify-center overflow-hidden relative",
                          isSelected
                            ? "bg-primary border-primary ring-2 ring-primary"
                            : "bg-background hover:bg-accent border-input"
                        )}
                      >
                        {provider.logo_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                            alt={provider.provider_name}
                            className="h-full w-full object-cover rounded-lg"
                          />
                        ) : (
                          <span className="text-xs font-medium truncate">{provider.provider_name.slice(0, 2)}</span>
                        )}
                        {isSelected && (
                          <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                            <Check className="h-5 w-5 text-white shrink-0" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {hasMoreWatchProviders && (
                <button
                  type="button"
                  onClick={() => setShowAllWatchProviders(!showAllWatchProviders)}
                  className="text-sm text-primary hover:underline cursor-pointer"
                >
                  {showAllWatchProviders ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}

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
                  className="w-4 h-4 cursor-pointer"
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
                  className="w-4 h-4 cursor-pointer"
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
                  className="w-4 h-4 cursor-pointer"
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
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Oldest</span>
              </label>
            </div>
          </div>

          {/* Genre Section */}
          {genresToShow && genresToShow.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold uppercase tracking-wider">Genre</Label>
              <div className="flex flex-wrap gap-2">
                {(showAllGenres ? genresToShow : genresToShow.slice(0, GENRES_TO_SHOW)).map((genre) => {
                  const isSelected = filters.genre.includes(genre.id);
                  return (
                    <Button
                      key={genre.id}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (isSelected) {
                          setFilters({ 
                            ...filters, 
                            genre: filters.genre.filter(id => id !== genre.id) 
                          });
                        } else {
                          setFilters({ 
                            ...filters, 
                            genre: [...filters.genre, genre.id] 
                          });
                        }
                      }}
                      className={cn(
                        "rounded-full h-8 px-4 text-sm font-normal transition-colors",
                        isSelected 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                          : "bg-background hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {genre.name}
                    </Button>
                  );
                })}
              </div>
              {genresToShow.length > GENRES_TO_SHOW && (
                <button
                  onClick={() => setShowAllGenres(!showAllGenres)}
                  className="text-sm text-primary hover:underline mt-2"
                >
                  {showAllGenres ? "Show less" : "Show more"}
                </button>
              )}
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
            className="flex-1 h-10 text-sm cursor-pointer"
            disabled={!hasActiveFilters}
          >
            Reset
          </Button>
          <Button
            onClick={onApply}
            className="flex-1 h-10 text-sm cursor-pointer bg-[#E50914] hover:bg-[#E50914]/90 text-white"
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

