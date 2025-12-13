"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useViewingLogs } from "@/hooks/use-viewing-logs";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { MoreLikeThisCardSkeleton } from "@/components/skeletons/more-like-this-card-skeleton";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Eye, Film, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import { SimplePagination as Pagination } from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 24;

type FilterType = "all" | "movie" | "tv";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: logs = [], isLoading } = useViewingLogs();
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<FilterType>(() => {
    const filter = searchParams.get("filter");
    return (filter === "movie" || filter === "tv") ? filter : "all";
  });

  // Update URL when filter changes
  useEffect(() => {
    const currentFilter = searchParams.get("filter");
    const expectedFilter = filterType === "all" ? null : filterType;
    
    if (currentFilter !== expectedFilter) {
      const params = new URLSearchParams(searchParams.toString());
      if (filterType === "all") {
        params.delete("filter");
      } else {
        params.set("filter", filterType);
      }
      const newUrl = params.toString() ? `/lists?${params.toString()}` : "/lists";
      router.push(newUrl);
    }
  }, [filterType, router, searchParams]);

  // Sync with URL changes (browser back/forward)
  useEffect(() => {
    const filter = searchParams.get("filter");
    if (filter === "movie" || filter === "tv") {
      setFilterType(filter);
    } else {
      setFilterType("all");
    }
  }, [searchParams]);

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

  // Filter by type
  const filteredItems = useMemo(() => {
    if (filterType === "all") return uniqueItems;
    return uniqueItems.filter(({ type }) => type === filterType);
  }, [uniqueItems, filterType]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage]);

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="border-b border-border max-w-fit">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          {[
            { id: "all" as FilterType, label: "All", icon: null },
            { id: "movie" as FilterType, label: "Movies", icon: Film },
            { id: "tv" as FilterType, label: "TV", icon: Tv },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setFilterType(tab.id);
                  setCurrentPage(1);
                }}
                className={cn(
                  "relative py-3 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2",
                  filterType === tab.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {tab.label}
                {filterType === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <MoreLikeThisCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
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
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
