"use client";

import { useState, useMemo } from "react";
import { useFavorites } from "@/hooks/use-favorites";
import { Skeleton } from "@/components/ui/skeleton";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Heart, Film, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import { SimplePagination as Pagination } from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 24;

type FilterType = "all" | "movie" | "tv";

// Convert favorite to TMDB format
function favoriteToTMDB(favorite: any): TMDBMovie | TMDBSeries {
  if (favorite.mediaType === "movie") {
    return {
      id: favorite.tmdbId,
      title: favorite.title,
      poster_path: favorite.posterPath,
      backdrop_path: favorite.backdropPath,
      release_date: favorite.releaseDate || undefined,
      vote_average: 0,
      overview: "",
    } as TMDBMovie;
  } else {
    return {
      id: favorite.tmdbId,
      name: favorite.title,
      poster_path: favorite.posterPath,
      backdrop_path: favorite.backdropPath,
      first_air_date: favorite.firstAirDate || undefined,
      vote_average: 0,
      overview: "",
    } as TMDBSeries;
  }
}

export default function MyListsFavoritesTab() {
  const { data: favorites = [], isLoading } = useFavorites();
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Convert favorites to TMDB format
  const items = useMemo(() => {
    return favorites.map((favorite) => ({
      item: favoriteToTMDB(favorite),
      type: favorite.mediaType as "movie" | "tv",
    }));
  }, [favorites]);

  // Filter by type
  const filteredItems = useMemo(() => {
    if (filterType === "all") return items;
    return items.filter(({ type }) => type === filterType);
  }, [items, filterType]);

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
      <div className="border-b border-border">
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
            <Skeleton key={i} className="w-full aspect-square rounded-lg" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
          <p className="text-muted-foreground">
            Add films and TV shows to your favorites to see them here
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
