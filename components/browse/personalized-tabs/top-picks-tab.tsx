"use client";

import { useState, useMemo } from "react";
import { usePersonalizedContent } from "@/hooks/use-movies";
import { useUser } from "@clerk/nextjs";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

const ITEMS_PER_PAGE = 24;

export function TopPicksTab() {
  const { isSignedIn } = useUser();
  const [currentPage, setCurrentPage] = useState(1);
  const { data: preferences } = useUserPreferences();

  // Normalize favoriteGenres - handle Extended JSON format from MongoDB
  const normalizeGenres = (genres: unknown[]): number[] => {
    return genres
      .map((g) => {
        // Handle Extended JSON format: {"$numberLong":"18"} or {"$numberInt":"18"}
        if (typeof g === "object" && g !== null) {
          const obj = g as Record<string, unknown>;
          if ("$numberLong" in obj && typeof obj.$numberLong === "string") {
            return Number.parseInt(obj.$numberLong, 10);
          }
          if ("$numberInt" in obj && typeof obj.$numberInt === "string") {
            return Number.parseInt(obj.$numberInt, 10);
          }
        }
        // Handle regular numbers or string numbers
        if (typeof g === "number") return g;
        if (typeof g === "string") {
          const parsed = Number.parseInt(g, 10);
          return Number.isNaN(parsed) ? null : parsed;
        }
        return null;
      })
      .filter((g): g is number => g !== null && !Number.isNaN(g));
  };

  const favoriteGenres = useMemo(() => {
    if (!preferences?.favoriteGenres) return [];
    return normalizeGenres(preferences.favoriteGenres as unknown[]);
  }, [preferences]);

  const preferredTypes = useMemo(() => {
    return (preferences?.preferredTypes || []) as ("movie" | "tv")[];
  }, [preferences]);

  const { data: personalizedData, isLoading } = usePersonalizedContent(
    favoriteGenres,
    preferredTypes.length > 0 ? preferredTypes : ["movie", "tv"]
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
        {Array.from({ length: 24 }).map((_, i) => (
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
        <div className="flex items-center justify-center gap-2 mt-8">
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
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="min-w-[40px] cursor-pointer"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
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

