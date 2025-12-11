"use client";

import { useMemo } from "react";
import { usePopularMovies, usePopularTV } from "@/hooks/use-movies";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

const MAX_ITEMS = 26;

export function MostPopularTab() {
  const { data: popularMovies = [], isLoading: isLoadingMovies } = usePopularMovies(1);
  const { data: popularTV = [], isLoading: isLoadingTV } = usePopularTV(1);

  const isLoading = isLoadingMovies || isLoadingTV;

  // Mix movies and TV shows, limit to 26 items
  const mixedItems = useMemo(() => {
    const items: Array<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" }> = [];
    
    // Interleave movies and TV shows
    const maxLength = Math.max(popularMovies.length, popularTV.length);
    for (let i = 0; i < maxLength && items.length < MAX_ITEMS; i++) {
      if (i < popularMovies.length && items.length < MAX_ITEMS) {
        items.push({ item: popularMovies[i], type: "movie" });
      }
      if (i < popularTV.length && items.length < MAX_ITEMS) {
        items.push({ item: popularTV[i], type: "tv" });
      }
    }
    
    return items.slice(0, MAX_ITEMS);
  }, [popularMovies, popularTV]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 26 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
        ))}
      </div>
    );
  }

  if (mixedItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No popular content available.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {mixedItems.map(({ item, type }) => (
        <MoreLikeThisCard key={`${type}-${item.id}`} item={item} type={type} showTypeBadge />
      ))}
    </div>
  );
}

