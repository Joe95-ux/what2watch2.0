"use client";

import { useState, useMemo } from "react";
import { usePersonalizedContent } from "@/hooks/use-movies";
import { useUser } from "@clerk/nextjs";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

const ITEMS_PER_PAGE = 26;

export function TopPicksTab() {
  const { user } = useUser();
  const [currentPage, setCurrentPage] = useState(1);

  // Get user preferences (you may need to fetch these from your API)
  // For now, using default values
  const favoriteGenres: number[] = [];
  const preferredTypes: ("movie" | "tv")[] = ["movie", "tv"];

  const { data: personalizedData, isLoading } = usePersonalizedContent(
    favoriteGenres,
    preferredTypes
  );

  // Personalized data is a flat array of TMDBMovie | TMDBSeries
  const allItems = useMemo(() => {
    if (!personalizedData || !Array.isArray(personalizedData)) return [];
    
    return personalizedData.map((item) => {
      // Determine type based on whether item has 'title' (movie) or 'name' (tv)
      const type: "movie" | "tv" = "title" in item ? "movie" : "tv";
      return { item, type };
    });
  }, [personalizedData]);

  const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = allItems.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 26 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
        ))}
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No personalized content available yet.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Add items to your favorites to get personalized recommendations.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {paginatedItems.map(({ item, type }) => (
          <MoreLikeThisCard key={`${type}-${item.id}`} item={item} type={type} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
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
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

