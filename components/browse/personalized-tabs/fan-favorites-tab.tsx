"use client";

import { useTopRatedMovies, useTopRatedTV } from "@/hooks/use-movies";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

const MAX_ITEMS = 26;

export function FanFavoritesTab() {
  const { data: topRatedMoviesData, isLoading: isLoadingMovies } = useTopRatedMovies(1);
  const { data: topRatedTVData, isLoading: isLoadingTV } = useTopRatedTV(1);

  const isLoading = isLoadingMovies || isLoadingTV;

  // Extract results from API response (top rated returns TMDBResponse with results property)
  const topRatedMovies = (topRatedMoviesData as { results?: TMDBMovie[] })?.results || [];
  const topRatedTV = (topRatedTVData as { results?: TMDBSeries[] })?.results || [];

  // Combine top rated movies and TV (these are fan favorites based on ratings)
  const fanFavorites = useMemo(() => {
    const items: Array<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" }> = [];
    
    // Interleave top rated movies and TV shows
    const maxLength = Math.max(topRatedMovies.length, topRatedTV.length);
    for (let i = 0; i < maxLength && items.length < MAX_ITEMS; i++) {
      if (i < topRatedMovies.length && items.length < MAX_ITEMS) {
        items.push({ item: topRatedMovies[i], type: "movie" });
      }
      if (i < topRatedTV.length && items.length < MAX_ITEMS) {
        items.push({ item: topRatedTV[i], type: "tv" });
      }
    }
    
    return items.slice(0, MAX_ITEMS);
  }, [topRatedMovies, topRatedTV]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 26 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
        ))}
      </div>
    );
  }

  if (fanFavorites.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No fan favorites available.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {fanFavorites.map(({ item, type }) => (
        <MoreLikeThisCard key={`${type}-${item.id}`} item={item} type={type} showTypeBadge />
      ))}
    </div>
  );
}

