"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TMDBPersonMovieCredits, TMDBPersonTVCredits, TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { createContentUrl } from "@/lib/content-slug";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupedPagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterType = "all" | "movie" | "tv";

interface PersonKnownForProps {
  movieCredits: TMDBPersonMovieCredits | null | undefined;
  tvCredits: TMDBPersonTVCredits | null | undefined;
  knownForDepartment: string;
}

const ITEMS_PER_PAGE = 24;

export default function PersonKnownFor({
  movieCredits,
  tvCredits,
  knownForDepartment,
}: PersonKnownForProps) {
  const router = useRouter();
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get top rated movies and TV shows, convert to TMDBMovie/TMDBSeries format
  const allKnownFor = useMemo(() => {
    const items: Array<TMDBMovie | TMDBSeries> = [];

    // Add top movies
    if (movieCredits?.cast) {
      const topMovies: TMDBMovie[] = movieCredits.cast
        .filter((m) => m.vote_average > 0 && m.poster_path)
        .sort((a, b) => b.vote_average - a.vote_average)
        .map((m) => ({
          id: m.id,
          title: m.title,
          overview: "",
          poster_path: m.poster_path,
          backdrop_path: m.backdrop_path,
          release_date: m.release_date,
          vote_average: m.vote_average,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          adult: false,
          original_language: "en",
          original_title: m.title,
        }));
      items.push(...topMovies);
    }

    // Add top TV shows
    if (tvCredits?.cast) {
      const topTV: TMDBSeries[] = tvCredits.cast
        .filter((t) => t.vote_average > 0 && t.poster_path)
        .sort((a, b) => b.vote_average - a.vote_average)
        .map((t) => ({
          id: t.id,
          name: t.name,
          overview: "",
          poster_path: t.poster_path,
          backdrop_path: t.backdrop_path,
          first_air_date: t.first_air_date,
          vote_average: t.vote_average,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          original_language: "en",
          original_name: t.name,
        }));
      items.push(...topTV);
    }

    // Sort by rating
    return items.sort((a, b) => b.vote_average - a.vote_average);
  }, [movieCredits, tvCredits]);

  // Filter by type
  const filteredByType = useMemo(() => {
    if (filterType === "all") return allKnownFor;
    if (filterType === "movie") {
      return allKnownFor.filter((item) => "title" in item);
    }
    return allKnownFor.filter((item) => "name" in item);
  }, [allKnownFor, filterType]);

  // Filter by search query
  const filteredKnownFor = useMemo(() => {
    if (!searchQuery.trim()) return filteredByType;
    
    const query = searchQuery.toLowerCase().trim();
    return filteredByType.filter((item) => {
      const title = "title" in item ? item.title : item.name;
      return title.toLowerCase().includes(query);
    });
  }, [filteredByType, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredKnownFor.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedKnownFor = filteredKnownFor.slice(startIndex, endIndex);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (allKnownFor.length === 0) {
    return (
      <section>
        <h2 className="text-2xl font-bold mb-6">Known For</h2>
        <p className="text-muted-foreground">No known credits available.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1 min-w-0 relative">
          {/* Heading and Search Icon - hidden when search is open */}
          <div
            className={cn(
              "flex items-center gap-3 transition-all duration-300 ease-in-out",
              isSearchOpen
                ? "opacity-0 -translate-x-full pointer-events-none absolute"
                : "opacity-100 translate-x-0"
            )}
          >
            <h2 className="text-2xl font-bold whitespace-nowrap">
              Known For ({filteredKnownFor.length})
            </h2>
            
            {/* Search Icon Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 cursor-pointer"
              onClick={() => {
                setIsSearchOpen(true);
              }}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Search Bar - replaces heading when open */}
          <div
            className={cn(
              "flex-1 max-w-md transition-all duration-300 ease-in-out",
              isSearchOpen
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-full pointer-events-none absolute left-0"
            )}
          >
            <div className="relative">
              <Input
                type="text"
                placeholder="Search movies or TV shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8"
                autoFocus={isSearchOpen}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-8 cursor-pointer"
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchOpen(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Filter Dropdown */}
        <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
          <SelectTrigger className="w-[140px] flex-shrink-0 cursor-pointer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              All
            </SelectItem>
            <SelectItem value="movie" className="cursor-pointer">
              Movies
            </SelectItem>
            <SelectItem value="tv" className="cursor-pointer">
              TV Shows
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-6">
        {paginatedKnownFor.map((item) => {
          const itemType = "title" in item ? "movie" : "tv";
          return (
            <MoreLikeThisCard
              key={item.id}
              item={item}
              type={itemType}
              onItemClick={(item, itemType) => {
                const title = "title" in item ? item.title : item.name;
                router.push(createContentUrl(itemType, item.id, title));
              }}
              showTypeBadge={true}
            />
          );
        })}
      </div>

      {/* Pagination */}
      <GroupedPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        className="mt-6"
      />
    </section>
  );
}

