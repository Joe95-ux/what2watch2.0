"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Plus, Eye, Check } from "lucide-react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AddToListDropdown from "./add-to-list-dropdown";
import { useIsWatched, useQuickWatch, useUnwatch } from "@/hooks/use-viewing-logs";
import { toast } from "sonner";
import { useUser, useClerk } from "@clerk/nextjs";

interface ActionButtonsSectionProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
}

export default function ActionButtonsSection({ item, type }: ActionButtonsSectionProps) {
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);

  // Watch status hooks
  const quickWatch = useQuickWatch();
  const unwatch = useUnwatch();
  const { data: watchedData } = useIsWatched(item.id, type);
  const isWatched = watchedData?.isWatched || false;
  const watchedLogId = watchedData?.logId || null;
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();

  const handleMarkAsWatched = async () => {
    if (!isSignedIn) {
      toast.error("Sign in to mark films as watched.");
      if (openSignIn) {
        openSignIn({
          afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
        });
      }
      return;
    }
    try {
      if (isWatched && watchedLogId) {
        await unwatch.mutateAsync(watchedLogId);
        toast.success("Removed from watched");
      } else {
        const title = type === "movie" ? (item as TMDBMovie).title : (item as TMDBSeries).name;
        await quickWatch.mutateAsync({
          tmdbId: item.id,
          mediaType: type,
          title,
          posterPath: item.poster_path || null,
          backdropPath: item.backdrop_path || null,
          releaseDate: "release_date" in item ? item.release_date || null : null,
          firstAirDate: "first_air_date" in item ? item.first_air_date || null : null,
        });
        toast.success("Marked as watched");
      }
    } catch {
      toast.error("Failed to update watched status");
    }
  };

  const handleLike = () => {
    // TODO: Implement like functionality
    if (isLiked) {
      setIsLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
    } else {
      setIsLiked(true);
      setLikeCount((prev) => prev + 1);
      if (isDisliked) {
        setIsDisliked(false);
        setDislikeCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const handleDislike = () => {
    // TODO: Implement dislike functionality
    if (isDisliked) {
      setIsDisliked(false);
      setDislikeCount((prev) => Math.max(0, prev - 1));
    } else {
      setIsDisliked(true);
      setDislikeCount((prev) => prev + 1);
      if (isLiked) {
        setIsLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b">
      <div className="flex items-center justify-end gap-2 overflow-x-auto">
        {/* Like/Dislike Button */}
        <div className="flex items-center rounded-[25px] bg-muted border border-border overflow-hidden">
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-2 px-4 py-2 transition-colors",
              isLiked ? "bg-primary/10 text-primary" : "hover:bg-muted/80"
            )}
          >
            <ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} />
            {likeCount > 0 && <span className="text-sm">{likeCount}</span>}
          </button>
          <div className="h-6 w-px bg-border" />
          <button
            onClick={handleDislike}
            className={cn(
              "flex items-center gap-2 px-4 py-2 transition-colors",
              isDisliked ? "bg-destructive/10 text-destructive" : "hover:bg-muted/80"
            )}
          >
            <ThumbsDown className={cn("h-4 w-4", isDisliked && "fill-current")} />
            {dislikeCount > 0 && <span className="text-sm">{dislikeCount}</span>}
          </button>
        </div>

        {/* Add to List Button */}
        <AddToListDropdown
          item={item}
          type={type}
          trigger={
            <Button variant="outline" size="sm" className="rounded-[25px] bg-muted">
              <Plus className="h-4 w-4 mr-2" />
              List
            </Button>
          }
        />

        {/* Watch Status Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAsWatched}
          className={cn(
            "rounded-[25px] bg-muted",
            isWatched && "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
          )}
        >
          {isWatched ? (
            <>
              <Check className="h-4 w-4 mr-2 text-green-500" />
              Watched
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Watch
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

