"use client";

import { useState, useMemo } from "react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useUser } from "@clerk/nextjs";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

const ITEMS_PER_PAGE = 24;

export function FromYourWatchlistTab() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const { data: watchlist = [], isLoading } = useWatchlist();
  const [currentPage, setCurrentPage] = useState(1);

  if (!isSignedIn) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Sign in to view your watchlist</p>
        <Button onClick={() => router.push("/sign-in")} className="cursor-pointer">
          Sign In
        </Button>
      </div>
    );
  }

  // Convert watchlist items to TMDB format and paginate
  const watchlistItems = useMemo(() => {
    return watchlist.map((watchlistItem) => {
      const item: TMDBMovie | TMDBSeries = {
        id: watchlistItem.tmdbId,
        poster_path: watchlistItem.posterPath,
        backdrop_path: watchlistItem.backdropPath,
        ...(watchlistItem.mediaType === "movie"
          ? {
              title: watchlistItem.title,
              release_date: watchlistItem.releaseDate || undefined,
            }
          : {
              name: watchlistItem.title,
              first_air_date: watchlistItem.releaseDate || undefined,
            }),
      } as TMDBMovie | TMDBSeries;

      return { item, type: watchlistItem.mediaType as "movie" | "tv" };
    });
  }, [watchlist]);

  const totalPages = Math.ceil(watchlistItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = watchlistItems.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 24 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
        ))}
      </div>
    );
  }

  if (watchlistItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium mb-2">Your watchlist is empty</p>
        <p className="text-muted-foreground mb-6">
          Start building your watchlist by adding movies and TV shows you want to watch.
        </p>
        <Button
          onClick={() => router.push("/browse")}
          className="cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Browse Content
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {paginatedItems.map(({ item, type }) => (
          <MoreLikeThisCard
            key={`${type}-${item.id}`}
            item={item}
            type={type}
          />
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

