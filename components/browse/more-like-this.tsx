"use client";

import { useState, useEffect } from "react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MoreLikeThisCard from "./more-like-this-card";

interface MoreLikeThisProps {
  items: (TMDBMovie | TMDBSeries)[];
  type: "movie" | "tv";
  title?: string;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const ITEMS_PER_PAGE = 12; // Show 12 items initially (3 rows x 4 columns on desktop)

export default function MoreLikeThis({ 
  items, 
  type, 
  title = "More Like This", 
  isLoading,
  onLoadMore,
  hasMore = false
}: MoreLikeThisProps) {
  const [displayedItems, setDisplayedItems] = useState(items.slice(0, ITEMS_PER_PAGE));

  // Update displayed items when items prop changes
  useEffect(() => {
    setDisplayedItems(items.slice(0, ITEMS_PER_PAGE));
  }, [items]);

  const handleLoadMore = () => {
    const currentCount = displayedItems.length;
    const nextItems = items.slice(0, currentCount + ITEMS_PER_PAGE);
    setDisplayedItems(nextItems);
    
    // If we've shown all items and there might be more, call the onLoadMore callback
    if (nextItems.length >= items.length && hasMore && onLoadMore) {
      onLoadMore();
    }
  };

  if (isLoading && displayedItems.length === 0) {
    return (
      <div className="w-full space-y-6">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  const showLoadMore = displayedItems.length < items.length || hasMore;

  return (
    <div className="w-full space-y-6">
      <h3 className="text-xl font-semibold">{title}</h3>
      
      {/* Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {displayedItems.map((item) => (
          <MoreLikeThisCard key={item.id} item={item} type={type} />
        ))}
      </div>

      {/* Load More Button */}
      {showLoadMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            className="px-8 py-6 text-base font-medium"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}

