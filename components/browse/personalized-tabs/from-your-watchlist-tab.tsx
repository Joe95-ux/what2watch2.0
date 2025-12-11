"use client";

import { useWatchlist } from "@/hooks/use-watchlist";
import { useUser } from "@clerk/nextjs";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

export function FromYourWatchlistTab() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const { data: watchlist = [], isLoading } = useWatchlist();

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

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
        ))}
      </div>
    );
  }

  if (watchlist.length === 0) {
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {watchlist.map((watchlistItem) => {
        // Fetch item details - for now, we'll need to construct the item from watchlistItem
        // This assumes watchlistItem has the necessary fields
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

        return (
          <MoreLikeThisCard
            key={`${watchlistItem.mediaType}-${watchlistItem.tmdbId}`}
            item={item}
            type={watchlistItem.mediaType}
          />
        );
      })}
    </div>
  );
}

