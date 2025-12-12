"use client";

import { ThumbsUp, ThumbsDown, Plus, Eye, Check, Heart, Loader2 } from "lucide-react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AddToListDropdown from "./add-to-list-dropdown";
import { useIsWatched, useQuickWatch, useUnwatch } from "@/hooks/use-viewing-logs";
import { useToggleFavorite } from "@/hooks/use-favorites";
import { useContentReactions, useLikeContent, useDislikeContent } from "@/hooks/use-content-reactions";
import { toast } from "sonner";
import { useUser, useClerk } from "@clerk/nextjs";

interface ActionButtonsSectionProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
}

export default function ActionButtonsSection({ item, type }: ActionButtonsSectionProps) {
  // Favorite hook
  const toggleFavorite = useToggleFavorite();

  // Content reactions (likes/dislikes)
  const { data: reactionData, isLoading: isLoadingReactions } = useContentReactions(item.id, type);
  const likeContent = useLikeContent();
  const dislikeContent = useDislikeContent();
  
  const isLiked = reactionData?.isLiked || false;
  const isDisliked = reactionData?.isDisliked || false;
  const likeCount = reactionData?.likeCount || 0;
  const dislikeCount = reactionData?.dislikeCount || 0;

  // Watch status hooks
  const quickWatch = useQuickWatch();
  const unwatch = useUnwatch();
  const { data: watchedData } = useIsWatched(item.id, type);
  const isWatched = watchedData?.isWatched || false;
  const watchedLogId = watchedData?.logId || null;
  const isWatchLoading = quickWatch.isPending || unwatch.isPending;
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

  const handleLike = async () => {
    if (!isSignedIn) {
      toast.error("Sign in to like content.");
      if (openSignIn) {
        openSignIn({
          afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
        });
      }
      return;
    }
    try {
      await likeContent.mutateAsync({
        tmdbId: item.id,
        mediaType: type,
      });
    } catch (error) {
      toast.error("Failed to update like status");
    }
  };

  const handleDislike = async () => {
    if (!isSignedIn) {
      toast.error("Sign in to dislike content.");
      if (openSignIn) {
        openSignIn({
          afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
        });
      }
      return;
    }
    try {
      await dislikeContent.mutateAsync({
        tmdbId: item.id,
        mediaType: type,
      });
    } catch (error) {
      toast.error("Failed to update dislike status");
    }
  };

  return (
    <div className="max-w-[1216px] mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b">
      <div className="flex items-center justify-end gap-2 overflow-x-auto">
        {/* Favorite Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await toggleFavorite.toggle(item, type);
          }}
          className={cn(
            "rounded-[25px] bg-muted cursor-pointer",
            toggleFavorite.isFavorite(item.id, type) && "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
          )}
        >
          <Heart
            className={cn(
              "h-4 w-4 mr-2",
              toggleFavorite.isFavorite(item.id, type)
                ? "text-red-500 fill-red-500"
                : ""
            )}
          />
          Favorite
        </Button>

        {/* Like/Dislike Button */}
        <div className="flex items-center rounded-[25px] bg-muted border border-border overflow-hidden">
          <button
            onClick={handleLike}
            disabled={isLoadingReactions || likeContent.isPending}
            className={cn(
              "flex items-center gap-2 px-4 py-2 transition-colors cursor-pointer",
              isLiked ? "bg-primary/10 text-primary" : "hover:bg-muted/80",
              (isLoadingReactions || likeContent.isPending) && "opacity-50 cursor-not-allowed"
            )}
          >
            <ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} />
            {likeCount > 0 && <span className="text-sm">{likeCount}</span>}
          </button>
          <div className="h-6 w-px bg-border" />
          <button
            onClick={handleDislike}
            disabled={isLoadingReactions || dislikeContent.isPending}
            className={cn(
              "flex items-center gap-2 px-4 py-2 transition-colors cursor-pointer",
              isDisliked ? "bg-destructive/10 text-destructive" : "hover:bg-muted/80",
              (isLoadingReactions || dislikeContent.isPending) && "opacity-50 cursor-not-allowed"
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
            <Button variant="outline" size="sm" className="rounded-[25px] bg-muted cursor-pointer">
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
          disabled={isWatchLoading}
          className={cn(
            "rounded-[25px] bg-muted cursor-pointer",
            isWatched && "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
            isWatchLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isWatched ? (
            <>
              <Check className="h-4 w-4 mr-2 text-green-500" />
              Watched
            </>
          ) : (
            <>
              {isWatchLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Watch
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

