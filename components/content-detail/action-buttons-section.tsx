"use client";

import Image from "next/image";
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
import type { JustWatchAvailabilityResponse } from "@/lib/justwatch";

interface ActionButtonsSectionProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  watchAvailability?: JustWatchAvailabilityResponse | null;
}

export default function ActionButtonsSection({ item, type, watchAvailability }: ActionButtonsSectionProps) {
  const primaryOffer =
    watchAvailability?.offersByType?.flatrate?.[0] ??
    watchAvailability?.offersByType?.buy?.[0] ??
    watchAvailability?.offersByType?.rent?.[0] ??
    watchAvailability?.allOffers?.[0] ??
    null;
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

  const isFavoriteLoading = toggleFavorite.isLoading;

  return (
    <div className="max-w-[1216px] mx-auto px-4 sm:px-0 py-4 border-b">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Primary streaming provider - left on desktop, top on mobile */}
        {primaryOffer && (
          <div className="flex-shrink-0">
            <a
              href={primaryOffer.standardWebUrl ?? primaryOffer.deepLinkUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center overflow-hidden rounded-lg bg-transparent hover:bg-muted/30 transition-colors cursor-pointer",
                "border border-[rgba(0,0,0,0.2)] dark:border-[rgba(255,255,255,0.1)]"
              )}
            >
              {primaryOffer.iconUrl ? (
                <>
                  <Image
                    src={primaryOffer.iconUrl}
                    alt={primaryOffer.providerName}
                    width={36}
                    height={36}
                    className="object-contain rounded-l-[7px] w-9 h-9 block flex-shrink-0"
                    unoptimized
                  />
                  <span className="pl-3 pr-4 py-2 text-[15px] font-medium">
                    WATCH ON {primaryOffer.providerName.toUpperCase()}
                  </span>
                </>
              ) : (
                <span className="px-4 py-2 text-[15px] font-medium">
                  WATCH ON {primaryOffer.providerName.toUpperCase()}
                </span>
              )}
            </a>
          </div>
        )}

        {/* Action buttons - right on desktop, below on mobile */}
        <div className="flex items-center justify-end gap-2 overflow-x-auto flex-shrink-0">
          {/* Favorite Button */}
          <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await toggleFavorite.toggle(item, type);
          }}
          disabled={isFavoriteLoading}
          className={cn(
            "h-9 rounded-[25px] bg-muted cursor-pointer flex-shrink-0",
            isFavoriteLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isFavoriteLoading ? (
            <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
          ) : (
            <Heart
              className={cn(
                "h-4 w-4",
                toggleFavorite.isFavorite(item.id, type)
                  ? "text-red-500 fill-red-500"
                  : ""
              )}
            />
          )}
          <span className="hidden sm:inline">Favorite</span>
        </Button>

        {/* Like/Dislike Button */}
        <div className="flex items-center rounded-[25px] bg-muted border border-border overflow-hidden flex-shrink-0">
          <button
            onClick={handleLike}
            disabled={isLoadingReactions || likeContent.isPending}
            className={cn(
              "flex items-center gap-2 px-4 py-2 transition-colors cursor-pointer",
              isLiked ? "text-primary" : "hover:bg-muted/80",
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
              isDisliked ? "text-primary" : "hover:bg-muted/80",
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
            <Button variant="outline" size="sm" className="h-9 rounded-[25px] bg-muted cursor-pointer flex-shrink-0">
              <Plus className="h-4 w-4" />
              Add To
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
            "h-9 rounded-[25px] bg-muted cursor-pointer flex-shrink-0",
            isWatched && "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
            isWatchLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isWatchLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isWatched ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span className="hidden sm:inline">Watched</span>
              <span className="sm:hidden">Seen</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 sm:mr-2" />
              Watch
            </>
          )}
        </Button>
        </div>
      </div>
    </div>
  );
}

