"use client";

import { useState, useMemo } from "react";
import { useFavorites } from "@/hooks/use-favorites";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Star } from "lucide-react";

const ITEMS_PER_PAGE = 24;

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

  // Convert favorites to TMDB format
  const items = useMemo(() => {
    return favorites.map((favorite) => ({
      item: favoriteToTMDB(favorite),
      type: favorite.mediaType as "movie" | "tv",
    }));
  }, [favorites]);

  // Pagination
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Favorites</h2>
        <p className="text-muted-foreground mt-1">
          Your favorite films and TV shows
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} className="w-full aspect-[2/3] rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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

