"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TMDBPersonMovieCredits, TMDBPersonTVCredits, TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
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
              className="h-8 w-8 flex-shrink-0"
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
                className="absolute right-0 top-0 h-full w-8"
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
          <SelectTrigger className="w-[140px] flex-shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="movie">Movies</SelectItem>
            <SelectItem value="tv">TV Shows</SelectItem>
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
                router.push(`/${itemType}/${item.id}`);
              }}
              showTypeBadge={true}
            />
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={cn("gap-1", isMobile && "px-2")}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {!isMobile && "Previous"}
                </Button>
              </PaginationItem>
              
              {(() => {
                const pages: (number | "ellipsis")[] = [];
                
                // If less than 6 pages, show all pages
                if (totalPages <= 5) {
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  // Always show first page
                  pages.push(1);
                  
                  // Show at least 1 2 3 4 5 before ellipsis
                  if (currentPage <= 5) {
                    // Show pages 2-5
                    for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
                      pages.push(i);
                    }
                    // Add ellipsis if there are more pages
                    if (totalPages > 5) {
                      pages.push("ellipsis");
                    }
                  } else if (currentPage >= totalPages - 4) {
                    // Show ellipsis and last 5 pages
                    pages.push("ellipsis");
                    for (let i = Math.max(2, totalPages - 4); i < totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    // Show ellipsis, pages around current, and ellipsis
                    pages.push("ellipsis");
                    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                      pages.push(i);
                    }
                    pages.push("ellipsis");
                  }
                  
                  // Always show last page if more than 5 pages
                  if (totalPages > 5) {
                    pages.push(totalPages);
                  }
                }
                
                // Remove duplicate ellipsis
                const uniquePages = pages.filter((page, index, self) => {
                  if (page === "ellipsis") {
                    return index === self.indexOf("ellipsis") || 
                           (index > 0 && self[index - 1] !== "ellipsis");
                  }
                  return index === self.findIndex((p) => p === page);
                });
                
                return uniquePages.map((page, index) => {
                  if (page === "ellipsis") {
                    return (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <span className="px-2">...</span>
                      </PaginationItem>
                    );
                  }
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(page);
                        }}
                        isActive={currentPage === page}
                        className="cursor-pointer px-2 rounded-sm"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                });
              })()}

              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={cn("gap-1", isMobile && "px-2")}
                >
                  {!isMobile && "Next"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </section>
  );
}

