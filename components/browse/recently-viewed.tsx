"use client";

import { useRecentlyViewed, useClearRecentlyViewed, recentlyViewedToTMDBItem } from "@/hooks/use-recently-viewed";
import ContentRow from "./content-row";
import { useState, useMemo } from "react";

export default function RecentlyViewed() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useRecentlyViewed();
  const clearRecentlyViewed = useClearRecentlyViewed();
  const [isClearing, setIsClearing] = useState(false);

  // Flatten all pages into a single array
  const items = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.items.map(recentlyViewedToTMDBItem));
  }, [data]);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await clearRecentlyViewed.mutateAsync();
    } catch (error) {
      console.error("Error clearing recently viewed:", error);
    } finally {
      setIsClearing(false);
    }
  };

  // Don't render if no items
  if (!isLoading && items.length === 0) {
    return null;
  }

  // Determine type based on first item (or default to movie)
  const type = items.length > 0 
    ? ("title" in items[0] ? "movie" : "tv")
    : "movie";

  return (
    <ContentRow
      title="Recently Viewed"
      items={items}
      type={type}
      isLoading={isLoading}
      showClearButton={items.length > 0}
      onClear={handleClear}
      isClearing={isClearing}
      onLoadMore={hasNextPage ? fetchNextPage : undefined}
      isLoadingMore={isFetchingNextPage}
    />
  );
}

