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
import { ChevronLeft, ChevronRight } from "lucide-react";

type FilterType = "all" | "movie" | "tv";

interface PersonKnownForProps {
  movieCredits: TMDBPersonMovieCredits | null | undefined;
  tvCredits: TMDBPersonTVCredits | null | undefined;
  knownForDepartment: string;
}

const ITEMS_PER_PAGE = 20;

export default function PersonKnownFor({
  movieCredits,
  tvCredits,
  knownForDepartment,
}: PersonKnownForProps) {
  const router = useRouter();
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [currentPage, setCurrentPage] = useState(1);

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
  const filteredKnownFor = useMemo(() => {
    if (filterType === "all") return allKnownFor;
    if (filterType === "movie") {
      return allKnownFor.filter((item) => "title" in item);
    }
    return allKnownFor.filter((item) => "name" in item);
  }, [allKnownFor, filterType]);

  // Pagination
  const totalPages = Math.ceil(filteredKnownFor.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedKnownFor = filteredKnownFor.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType]);

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
        <h2 className="text-2xl font-bold">
          Known For ({filteredKnownFor.length})
        </h2>
        
        {/* Filter Dropdown */}
        <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
          <SelectTrigger className="w-[140px]">
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
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              </PaginationItem>
              
              {(() => {
                const pages: (number | "ellipsis")[] = [];
                
                // Always show first page
                pages.push(1);
                
                // Add ellipsis if needed
                if (currentPage > 3) {
                  pages.push("ellipsis");
                }
                
                // Add pages around current
                for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                  if (i !== 1 && i !== totalPages) {
                    pages.push(i);
                  }
                }
                
                // Add ellipsis if needed
                if (currentPage < totalPages - 2) {
                  pages.push("ellipsis");
                }
                
                // Always show last page
                if (totalPages > 1) {
                  pages.push(totalPages);
                }
                
                // Remove duplicates
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
                        className="cursor-pointer"
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
                  className="gap-1"
                >
                  Next
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

