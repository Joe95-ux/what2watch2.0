"use client";

import { useState } from "react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp } from "lucide-react";
import MoreLikeThisCard from "./more-like-this-card";

interface MoreLikeThisProps {
  items: (TMDBMovie | TMDBSeries)[];
  type: "movie" | "tv";
  title?: string;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const INITIAL_ITEMS = 8; // Show 8 items initially (half of max)
const MAX_ITEMS = 16; // Maximum items to show

export default function MoreLikeThis({ 
  items, 
  type, 
  title = "More Like This", 
  isLoading,
  onLoadMore,
  hasMore = false
}: MoreLikeThisProps) {
  // Limit items to MAX_ITEMS
  const limitedItems = items.slice(0, MAX_ITEMS);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Show 12 initially, or all if less than 12
  const displayedItems = isExpanded 
    ? limitedItems 
    : limitedItems.slice(0, INITIAL_ITEMS);

  const canToggle = limitedItems.length > INITIAL_ITEMS;
  const hasMoreToLoad = items.length > MAX_ITEMS || hasMore;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    
    // If expanding and we've shown all limited items, call onLoadMore if available
    if (!isExpanded && displayedItems.length >= limitedItems.length && hasMoreToLoad && onLoadMore) {
      onLoadMore();
    }
  };

  if (isLoading && limitedItems.length === 0) {
    return (
      <div className="w-full space-y-6">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!limitedItems || limitedItems.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-6">
      <h3 className="text-xl font-semibold">{title}</h3>
      
      {/* Grid Layout - 3-4 columns responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {displayedItems.map((item) => (
          <MoreLikeThisCard key={item.id} item={item} type={type} />
        ))}
      </div>

      {/* Toggle Button - Netflix Style with Horizontal Line */}
      {canToggle && (
        <div className="relative pt-6">
          {/* Horizontal Line with Subtle Overlay */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />
          
          {/* Circular Toggle Button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              disabled={isLoading}
              className="h-12 w-12 rounded-full p-0 bg-white/10 text-white border-white/30 hover:bg-white/20 hover:border-white/50 backdrop-blur-sm transition-all duration-300 hover:scale-105 cursor-pointer"
              aria-label={isExpanded ? "Show less" : "Show more"}
            >
              {isExpanded ? (
                <ChevronUp className="size-6 text-white" />
              ) : (
                <ChevronDown className="size-6 text-white" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

