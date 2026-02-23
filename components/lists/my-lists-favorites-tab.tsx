"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useFavorites } from "@/hooks/use-favorites";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { MoreLikeThisCardSkeleton } from "@/components/skeletons/more-like-this-card-skeleton";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { SimplePagination as Pagination } from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: favorites = [], isLoading } = useFavorites();
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
      {/* Filter Tabs - Popular page style */}
      <Tabs value={filterType} onValueChange={(v) => {
        setFilterType(v as FilterType);
        setCurrentPage(1);
      }} className="w-full">
        <TabsList>
          <TabsTrigger value="all" className="cursor-pointer">All</TabsTrigger>
          <TabsTrigger value="movie" className="cursor-pointer">Movies</TabsTrigger>
          <TabsTrigger value="tv" className="cursor-pointer">TV Shows</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <MoreLikeThisCardSkeleton key={i} />
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
