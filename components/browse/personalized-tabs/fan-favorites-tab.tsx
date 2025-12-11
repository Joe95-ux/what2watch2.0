"use client";

import { useSearch } from "@/hooks/use-search";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

const MAX_ITEMS = 26;
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = CURRENT_YEAR - 4; // Last 5 years (including current year)

export function FanFavoritesTab() {
  // Fetch new movies with high ratings (last 5 years, sorted by rating)
  // Fetch multiple pages to get enough results, then sort by rating
  const { data: moviesData, isLoading: isLoadingMovies } = useSearch({
    type: "movie",
    year: `${MIN_YEAR}-${CURRENT_YEAR}`,
    minRating: 7.0,
    sortBy: "vote_average.desc",
    page: 1,
  });

  // Fetch new TV shows with high ratings (last 5 years, sorted by rating)
  const { data: tvData, isLoading: isLoadingTV } = useSearch({
    type: "tv",
    year: `${MIN_YEAR}-${CURRENT_YEAR}`,
    minRating: 7.0,
    sortBy: "vote_average.desc",
    page: 1,
  });

  const isLoading = isLoadingMovies || isLoadingTV;

  // Extract results from API response
  const movies = moviesData?.results || [];
  const tvShows = tvData?.results || [];

  // Combine and sort by rating (highest first), limiting to MAX_ITEMS
  const fanFavorites = useMemo(() => {
    const items: Array<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv"; rating: number }> = [];
    
    // Minimum vote count threshold to ensure ratings are credible
    const MIN_VOTE_COUNT = 200;
    // Maximum realistic rating (filter out obvious data errors)
    const MAX_REALISTIC_RATING = 9.5;
    
    // Add movies with their ratings, filtering out unrealistic ratings
    movies.forEach((movie) => {
      const rating = movie.vote_average || 0;
      const voteCount = movie.vote_count || 0;
      
      // Filter out items with:
      // - Ratings above 9.5 (unrealistic, likely data errors)
      // - Fewer than minimum vote count (not credible)
      // - Invalid ratings (0 or negative)
      if (
        rating > 0 &&
        rating <= MAX_REALISTIC_RATING &&
        voteCount >= MIN_VOTE_COUNT
      ) {
        items.push({
          item: movie,
          type: "movie",
          rating: rating,
        });
      }
    });
    
    // Add TV shows with their ratings, filtering out unrealistic ratings
    tvShows.forEach((tv) => {
      const rating = tv.vote_average || 0;
      const voteCount = tv.vote_count || 0;
      
      // Same validation as movies
      if (
        rating > 0 &&
        rating <= MAX_REALISTIC_RATING &&
        voteCount >= MIN_VOTE_COUNT
      ) {
        items.push({
          item: tv,
          type: "tv",
          rating: rating,
        });
      }
    });
    
    // Sort by rating (highest first), then by vote count for tie-breaking
    items.sort((a, b) => {
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return (b.item.vote_count || 0) - (a.item.vote_count || 0);
    });
    
    // Return top MAX_ITEMS, removing the rating property
    return items.slice(0, MAX_ITEMS).map(({ item, type }) => ({ item, type }));
  }, [movies, tvShows]);

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

