"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, ChevronUp, Eye, Film, Plus, Star, Tv } from "lucide-react";
import { IoBookmarkSharp } from "react-icons/io5";
import { getPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import {
  useIMDBRating,
  useMovieDetails,
  useOMDBData,
  useTVDetails,
  useWatchProviders,
} from "@/hooks/use-content-details";
import { useIsWatched, useQuickWatch, useUnwatch } from "@/hooks/use-viewing-logs";
import { useAddToWatchlist, useRemoveFromWatchlist, useWatchlist } from "@/hooks/use-watchlist";
import { Button } from "@/components/ui/button";
import { IMDBBadge } from "@/components/ui/imdb-badge";

interface SimpleMediaListItemProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  yearLabel?: string;
  addedLabel?: string;
  orderLabel?: string;
  onClick?: () => void;
}

export function SimpleMediaListItem({
  tmdbId,
  mediaType,
  title,
  posterPath,
  yearLabel,
  addedLabel,
  orderLabel,
  onClick,
}: SimpleMediaListItemProps) {
  const [rankWindow, setRankWindow] = useState<"1d" | "7d" | "30d">("7d");
  const quickWatch = useQuickWatch();
  const unwatch = useUnwatch();
  const { data: watchlist = [] } = useWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();
  const { data: watchedData } = useIsWatched(tmdbId, mediaType);
  const isWatched = watchedData?.isWatched || false;
  const watchedLogId = watchedData?.logId || null;
  const { data: movieDetails } = useMovieDetails(mediaType === "movie" ? tmdbId : null);
  const { data: tvDetails } = useTVDetails(mediaType === "tv" ? tmdbId : null);
  const details = mediaType === "movie" ? movieDetails : tvDetails;
  const imdbId = mediaType === "movie" ? movieDetails?.imdb_id : tvDetails?.imdb_id;
  const { data: omdbData } = useOMDBData(imdbId || null);
  const tmdbRating = details?.vote_average && details.vote_average > 0 ? details.vote_average : null;
  const { data: ratingData } = useIMDBRating(imdbId || null, tmdbRating);
  const { data: watchAvailability } = useWatchProviders(mediaType, tmdbId, "US");
  const primaryOffer =
    watchAvailability?.offersByType?.flatrate?.[0] ??
    watchAvailability?.offersByType?.buy?.[0] ??
    watchAvailability?.offersByType?.rent?.[0] ??
    watchAvailability?.allOffers?.[0] ??
    null;

  const activeRankWindow =
    watchAvailability?.ranks?.[rankWindow] ??
    watchAvailability?.ranks?.["7d"] ??
    watchAvailability?.ranks?.["30d"] ??
    watchAvailability?.ranks?.["1d"];
  const justWatchRank = activeRankWindow?.rank ?? null;
  const justWatchDelta = activeRankWindow?.delta ?? null;
  const metascore = omdbData?.metascore || null;
  const rated = omdbData?.rated || null;
  const displayRating = ratingData?.rating || tmdbRating;
  const ratingSource = ratingData?.source || (tmdbRating ? "tmdb" : null);
  const runtime =
    mediaType === "movie" ? movieDetails?.runtime : tvDetails?.episode_run_time?.[0];
  const averageEpisodeRuntime =
    mediaType === "tv" ? tvDetails?.episode_run_time?.[0] || null : null;
  const numberOfEpisodes =
    mediaType === "tv" ? tvDetails?.number_of_episodes || null : null;
  const formattedRuntime = runtime
    ? `${Math.floor(runtime / 60)}h ${runtime % 60}m`
    : null;

  const isInWatchlist = watchlist.some((w) => w.tmdbId === tmdbId && w.mediaType === mediaType);

  const handleWatchlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isInWatchlist) {
        await removeFromWatchlist.mutateAsync({ tmdbId, mediaType });
      } else {
        await addToWatchlist.mutateAsync({
          tmdbId,
          mediaType,
          title,
          posterPath,
          backdropPath: ("backdrop_path" in (details || {}) ? details?.backdrop_path : null) || null,
          releaseDate: mediaType === "movie" ? (movieDetails?.release_date || undefined) : undefined,
          firstAirDate: mediaType === "tv" ? (tvDetails?.first_air_date || undefined) : undefined,
        });
      }
    } catch {
      // no-op toast here; calling components already handle feedback patterns
    }
  };

  const handleWatchToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isWatched && watchedLogId) {
        await unwatch.mutateAsync(watchedLogId);
      } else {
        await quickWatch.mutateAsync({
          tmdbId,
          mediaType,
          title,
          posterPath,
          backdropPath: ("backdrop_path" in (details || {}) ? details?.backdrop_path : null) || null,
          releaseDate: mediaType === "movie" ? (movieDetails?.release_date || null) : null,
          firstAirDate: mediaType === "tv" ? (tvDetails?.first_air_date || null) : null,
        });
      }
    } catch {
      // no-op toast here; calling components already handle feedback patterns
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left cursor-pointer py-3 px-3 transition-colors"
    >
      <div className="flex items-center gap-4">
        {posterPath ? (
          <div className="relative w-28 h-40 sm:w-28 sm:h-[9.5rem] rounded-[5px] overflow-hidden flex-shrink-0 bg-muted">
            <Image
              src={getPosterUrl(posterPath, "w500")}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 112px, 128px"
              unoptimized
            />
            <div
              onClick={handleWatchlistToggle}
              role="button"
              tabIndex={0}
              aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
              className="absolute -top-[3px] -left-[9px] z-10 flex items-center justify-center cursor-pointer"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleWatchlistToggle(e as unknown as React.MouseEvent);
                }
              }}
            >
              <div className="relative flex items-center justify-center">
                <IoBookmarkSharp
                  className={cn(
                    "h-[44px] w-[44px]",
                    isInWatchlist ? "text-[#E0B416] fill-[#E0B416]" : "text-gray-900 fill-gray-900"
                  )}
                />
                {isInWatchlist ? (
                  <Check className="absolute top-[5px] size-6 text-black z-10" />
                ) : (
                  <Plus className="absolute top-[5px] size-6 text-white z-10" />
                )}
              </div>
            </div>
            {primaryOffer && (
              <div className="absolute bottom-0 left-0 right-0 p-1">
                <a
                  href={primaryOffer.standardWebUrl ?? primaryOffer.deepLinkUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center h-7 w-full overflow-hidden rounded-[5px] bg-black/70 hover:bg-black/80 transition-colors cursor-pointer"
                >
                  {primaryOffer.iconUrl ? (
                    <>
                      <Image
                        src={primaryOffer.iconUrl}
                        alt={primaryOffer.providerName}
                        width={28}
                        height={28}
                        className="object-contain rounded-l-[5px] w-7 h-7 block flex-shrink-0"
                        unoptimized
                      />
                      <span className="pl-2 pr-2 flex items-center text-[12px] font-medium truncate text-white">
                        Watch Now
                      </span>
                    </>
                  ) : (
                    <span className="px-2 flex items-center text-[12px] font-medium truncate text-white">
                      Watch Now
                    </span>
                  )}
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="w-28 h-40 sm:w-32 sm:h-48 rounded-[5px] bg-muted flex-shrink-0 flex items-center justify-center">
            {mediaType === "movie" ? (
              <Film className="h-6 w-6 text-muted-foreground" />
            ) : (
              <Tv className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {orderLabel && <span className="text-sm text-muted-foreground">{orderLabel}</span>}
            <h3 className="text-lg font-semibold truncate">{title}</h3>
            {addedLabel && <span className="text-xs text-muted-foreground">Added {addedLabel}</span>}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
            {yearLabel && <span>{yearLabel}</span>}
            {mediaType === "movie"
              ? formattedRuntime && (
                  <>
                    {yearLabel && <span>•</span>}
                    <span>{formattedRuntime}</span>
                  </>
                )
              : averageEpisodeRuntime && (
                  <>
                    {yearLabel && <span>•</span>}
                    <span>{Math.floor(averageEpisodeRuntime / 60)}h {averageEpisodeRuntime % 60}m</span>
                  </>
                )}
            {numberOfEpisodes && (
              <>
                {(yearLabel || averageEpisodeRuntime) && <span>•</span>}
                <span>{numberOfEpisodes} episodes</span>
              </>
            )}
            {rated && (
              <>
                <span>•</span>
                <span>{rated}</span>
              </>
            )}
            {metascore && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center text-xs font-bold",
                      metascore >= 60
                        ? "bg-green-500 text-white"
                        : metascore >= 40
                        ? "bg-yellow-500 text-white"
                        : "bg-red-500 text-white"
                    )}
                  >
                    {metascore}
                  </div>
                  <span className="text-xs text-muted-foreground">Metascore</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
            {displayRating && displayRating > 0 && (
              <div className="flex items-center gap-1.5">
                {ratingSource === "imdb" ? (
                  <IMDBBadge size={16} />
                ) : (
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                )}
                <span className="font-semibold">{displayRating.toFixed(1)}</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 cursor-pointer"
              onClick={handleWatchToggle}
            >
              <Eye className={cn("h-4 w-4", isWatched ? "text-green-500" : "text-muted-foreground")} />
            </Button>
            <span className="text-sm text-muted-foreground">
              {isWatched ? "Watched" : "Mark as watched"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <Image src="/jw-icon.png" alt="JustWatch" width={16} height={16} className="object-contain" unoptimized />
              <span className="text-jw-gold font-medium">
                {justWatchRank != null ? `#${justWatchRank}` : "-"}
              </span>
              {justWatchDelta != null && justWatchDelta !== 0 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium",
                    justWatchDelta > 0 ? "bg-green-600 text-white" : "bg-red-600 text-white"
                  )}
                >
                  {justWatchDelta > 0 ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {Math.abs(justWatchDelta)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {(["1d", "7d", "30d"] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRankWindow(w);
                  }}
                  className={cn(
                    "px-1.5 py-0.5 rounded cursor-pointer",
                    rankWindow === w ? "bg-muted font-medium text-foreground" : "hover:text-foreground"
                  )}
                >
                  {w === "1d" ? "24h" : w}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

