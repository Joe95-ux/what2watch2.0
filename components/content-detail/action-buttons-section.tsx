"use client";

import Image from "next/image";
import { ThumbsUp, ThumbsDown, Plus, Check, Heart, Loader2 } from "lucide-react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AddToListDropdown from "./add-to-list-dropdown";
import { useIsWatched, useQuickWatch, useUnwatch } from "@/hooks/use-viewing-logs";
import { useSeenEpisodes, useUnmarkSeasonsSeen, useSeenSeasons } from "@/hooks/use-episode-tracking";
import { useToggleFavorite } from "@/hooks/use-favorites";
import { useContentReactions, useLikeContent, useDislikeContent } from "@/hooks/use-content-reactions";
import { toast } from "sonner";
import { useUser, useClerk } from "@clerk/nextjs";
import { useIsMobile } from "@/hooks/use-mobile";
import type { JustWatchAvailabilityResponse } from "@/lib/justwatch";

interface ActionButtonsSectionProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  watchAvailability?: JustWatchAvailabilityResponse | null;
  seasons?: Array<{
    id: number;
    name: string;
    overview: string;
    season_number: number;
    episode_count: number;
    air_date: string | null;
    poster_path: string | null;
  }>;
  onSeenAllClick?: () => void;
}

export default function ActionButtonsSection({ item, type, watchAvailability, seasons, onSeenAllClick }: ActionButtonsSectionProps) {
  const isMobile = useIsMobile();
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
  
  // Episode tracking for TV shows
  const { data: seenEpisodes = [] } = useSeenEpisodes(type === "tv" ? item.id : null);
  const { data: seenSeasons = [] } = useSeenSeasons(type === "tv" ? item.id : null);
  const unmarkSeasonsSeen = useUnmarkSeasonsSeen();
  
  const isWatchLoading = quickWatch.isPending || unwatch.isPending || (type === "tv" ? unmarkSeasonsSeen.isPending : false);
  
  // Check if all episodes are seen (for TV shows)
  // This accurately checks if all regular seasons (excluding season 0) have all their episodes seen
  const allEpisodesSeen = type === "tv" && seasons && Array.isArray(seenSeasons) && seenSeasons.length > 0
    ? (() => {
        // Get all regular seasons (excluding season 0)
        const regularSeasons = seasons.filter(s => s.season_number > 0);
        if (regularSeasons.length === 0) return false;
        
        // Check if all regular seasons are in the seen seasons list
        const regularSeasonNumbers = regularSeasons.map(s => s.season_number);
        return regularSeasonNumbers.every(seasonNum => seenSeasons.includes(seasonNum));
      })()
    : false;
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
    
    // For TV shows, handle seen/unseen logic
    if (type === "tv") {
      // If all episodes are seen, unmark all seasons
      if (allEpisodesSeen && seasons) {
        try {
          const allSeasonNumbers = seasons
            .filter(s => s.season_number > 0)
            .map(s => s.season_number);
          
          if (allSeasonNumbers.length > 0) {
            await unmarkSeasonsSeen.mutateAsync({
              tvShowTmdbId: item.id,
              seasonNumbers: allSeasonNumbers,
            });
          }
        } catch {
          toast.error("Failed to unmark episodes as seen");
        }
        return;
      }
      
      // If not all episodes are seen, open the "Seen all" modal
      if (onSeenAllClick) {
        onSeenAllClick();
        return;
      }
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

  const primaryLabel =
    isMobile && primaryOffer?.deepLinkUrl
      ? "Open in app"
      : primaryOffer
        ? `WATCH ON ${primaryOffer.providerName.toUpperCase()}`
        : "";
  const primaryLabelDisplay = isMobile && primaryLabel
    ? primaryLabel.split(/\s+/).slice(0, 3).join(" ")
    : primaryLabel;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-start gap-4 py-4 border-b">
        {/* Primary streaming provider - left on desktop, top on mobile */}
        {primaryOffer && (
          <div className="flex-shrink-0 min-w-0">
            <a
              href={isMobile && primaryOffer.deepLinkUrl ? (primaryOffer.deepLinkUrl ?? primaryOffer.standardWebUrl ?? "#") : (primaryOffer.standardWebUrl ?? primaryOffer.deepLinkUrl ?? "#")}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-stretch h-10 overflow-hidden rounded-lg bg-muted dark:bg-transparent hover:bg-muted/30 transition-colors cursor-pointer max-w-full",
                "dark:border dark:border-[rgba(255,255,255,0.1)]"
              )}
            >
              {primaryOffer.iconUrl ? (
                <>
                  <Image
                    src={primaryOffer.iconUrl}
                    alt={primaryOffer.providerName}
                    width={40}
                    height={40}
                    className="object-contain rounded-l-[7px] w-10 h-10 block flex-shrink-0"
                    unoptimized
                  />
                  <span className="pl-3 pr-4 flex items-center text-[15px] font-medium truncate">
                    {primaryLabelDisplay}
                  </span>
                </>
              ) : (
                <span className="px-4 flex items-center text-[15px] font-medium truncate">
                  {primaryLabelDisplay}
                </span>
              )}
            </a>
          </div>
        )}

        {/* Action buttons - right on desktop (ml-auto when space), scrollable when narrow */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide
         min-w-0 md:ml-auto">
          {/* Favorite Button */}
          <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await toggleFavorite.toggle(item, type);
          }}
          disabled={isFavoriteLoading}
          className={cn(
            "h-9 rounded-[25px] bg-muted cursor-pointer flex-shrink-0 border-none",
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
        <div className="flex items-center rounded-[25px] bg-muted border border-border overflow-hidden flex-shrink-0 border-none">
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
            <Button variant="outline" size="sm" className="h-9 rounded-[25px] bg-muted cursor-pointer flex-shrink-0 border-none">
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
            "h-9 rounded-[25px] bg-muted cursor-pointer flex-shrink-0 border-none",
            isWatchLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          {(isWatched || (type === "tv" && allEpisodesSeen)) ? (
            <>
              {isWatchLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-green-500" />
              ) : (
                <Check className={cn("h-4 w-4 font-bold text-green-500")} strokeWidth={3} />
              )}
              <span className={cn("hidden sm:inline text-green-500")}>
                {type === "tv" ? "Seen all" : "Seen"}
              </span>
              <span className={cn("sm:hidden text-green-500")}>
                {type === "tv" ? "Seen all" : "Seen"}
              </span>
            </>
          ) : (
            <>
              {isWatchLoading ? (
                <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 sm:mr-2 font-bold" strokeWidth={3} />
              )}
              {type === "tv" ? "Seen all" : "Seen"}
            </>
          )}
        </Button>
        </div>
      </div>
    </div>
  );
}

