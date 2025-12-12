"use client";

import { useState, useMemo } from "react";
import { useViewingLogs } from "@/hooks/use-viewing-logs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Eye } from "lucide-react";

const ITEMS_PER_PAGE = 24;

// Convert viewing log to TMDB format
function logToTMDB(log: any): TMDBMovie | TMDBSeries {
  if (log.mediaType === "movie") {
    return {
      id: log.tmdbId,
      title: log.title,
      poster_path: log.posterPath,
      backdrop_path: log.backdropPath,
      release_date: log.releaseDate || undefined,
      vote_average: 0,
      overview: "",
    } as TMDBMovie;
  } else {
    return {
      id: log.tmdbId,
      name: log.title,
      poster_path: log.posterPath,
      backdrop_path: log.backdropPath,
      first_air_date: log.firstAirDate || undefined,
      vote_average: 0,
      overview: "",
    } as TMDBSeries;
  }
}

export default function MyListsWatchedTab() {
  const { data: logs = [], isLoading } = useViewingLogs();
  const [currentPage, setCurrentPage] = useState(1);

  // Convert logs to TMDB format and remove duplicates (keep most recent)
  const uniqueItems = useMemo(() => {
    const seen = new Map<string, { item: TMDBMovie | TMDBSeries; type: "movie" | "tv"; log: any }>();
    
    // Sort by watchedAt descending to keep most recent
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime()
    );

    for (const log of sortedLogs) {
      const key = `${log.tmdbId}-${log.mediaType}`;
      if (!seen.has(key)) {
        seen.set(key, {
          item: logToTMDB(log),
          type: log.mediaType as "movie" | "tv",
          log,
        });
      }
    }
    
    return Array.from(seen.values());
  }, [logs]);

  // Pagination
  const totalPages = Math.ceil(uniqueItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return uniqueItems.slice(startIndex, endIndex);
  }, [uniqueItems, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Watched</h2>
        <p className="text-muted-foreground mt-1">
          Films and TV shows you&apos;ve watched
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} className="w-full aspect-[2/3] rounded-lg" />
          ))}
        </div>
      ) : uniqueItems.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No watched items yet</h3>
          <p className="text-muted-foreground">
            Start watching films and TV shows to see them here
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {paginatedItems.map(({ item, type }) => (
              <MoreLikeThisCard
                key={`${item.id}-${type}`}
                item={item}
                type={type}
                showTypeBadge
              />
            ))}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="cursor-pointer"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="cursor-pointer"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

