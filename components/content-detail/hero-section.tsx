"use client";

import { useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { Play, Heart, Clapperboard, Images, Star, Eye, Plus, Check } from "lucide-react";
import { ImBookmark } from "react-icons/im";
import {
  TMDBMovie,
  TMDBSeries,
  TMDBVideo,
  getPosterUrl,
  getBackdropUrl,
} from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { useToggleFavorite } from "@/hooks/use-favorites";
import { useToggleWatchlist } from "@/hooks/use-watchlist";
import { useIMDBRating } from "@/hooks/use-content-details";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import { cn } from "@/lib/utils";
import TrailerModal from "@/components/browse/trailer-modal";
import { CircleActionButton } from "@/components/browse/circle-action-button";
import LogToDiaryDropdown from "@/components/browse/log-to-diary-dropdown";
import MediaModal from "./media-modal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DetailsType {
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  genres?: Array<{ id: number; name: string }>;
  imdb_id?: string;
  images?: {
    backdrops?: Array<{ file_path: string }>;
    posters?: Array<{ file_path: string }>;
    stills?: Array<{ file_path: string }>;
  };
}

interface HeroSectionProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  details: DetailsType | null;
  trailer: TMDBVideo | null;
  videosData: { id: number; results: TMDBVideo[] } | null;
}

export default function HeroSection({ item, type, details, trailer, videosData }: HeroSectionProps) {
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [initialVideoId, setInitialVideoId] = useState<string | null>(null);
  const [isPhotosModalOpen, setIsPhotosModalOpen] = useState(false);
  const [trailerDuration, setTrailerDuration] = useState<number | null>(null);
  const toggleFavorite = useToggleFavorite();
  const toggleWatchlist = useToggleWatchlist();

  const title = type === "movie" ? (item as TMDBMovie).title : (item as TMDBSeries).name;
  const posterPath = item.poster_path || item.backdrop_path;
  const backdropPath = item.backdrop_path || item.poster_path;

  const videoCount = videosData?.results?.length ?? 0;
  const photoCount =
    (details?.images?.backdrops?.length ?? 0) +
    (details?.images?.posters?.length ?? 0) +
    (details?.images?.stills?.length ?? 0);

  // Fetch IMDb rating (with TMDB fallback)
  const imdbId = details?.imdb_id || null;
  const tmdbRating = item.vote_average > 0 ? item.vote_average : null;
  const { data: ratingData } = useIMDBRating(imdbId, tmdbRating);
  
  // Use IMDb rating if available, otherwise fall back to TMDB
  const displayRating = ratingData?.rating || tmdbRating;
  const ratingSource = ratingData?.source || (tmdbRating ? "tmdb" : null);

  const formatRuntime = (minutes: number | number[] | undefined, isTV: boolean = false): string | null => {
    if (!minutes) return null;
    if (Array.isArray(minutes)) {
      // For TV shows, calculate average of episode runtimes
      if (isTV && minutes.length > 0) {
        const average = Math.round(minutes.reduce((sum, val) => sum + val, 0) / minutes.length);
        const hours = Math.floor(average / 60);
        const mins = average % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }
      // For movies or single value, use first value
      if (minutes.length > 0) {
        const hours = Math.floor(minutes[0] / 60);
        const mins = minutes[0] % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }
      return null;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatYear = (date: string | undefined): string | null => {
    if (!date) return null;
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return null;
    return String(parsed.getFullYear());
  };

  const releaseYear =
    type === "movie"
      ? formatYear(details?.release_date)
      : formatYear(details?.first_air_date);

  const runtimeText =
    type === "movie"
      ? formatRuntime(details?.runtime, false)
      : formatRuntime(details?.episode_run_time, true);

  // Fetch trailer duration from YouTube if available
  useEffect(() => {
    if (!trailer?.key) {
      setTrailerDuration(null);
      return;
    }

    // First check if TMDB provides runtime
    if (trailer.runtime && typeof trailer.runtime === 'number' && trailer.runtime > 0) {
      setTrailerDuration(trailer.runtime);
      return;
    }

    // If not, try to fetch from YouTube API
    const fetchTrailerDuration = async () => {
      console.log('[Hero Section] Fetching trailer duration for videoId:', trailer.key);
      try {
        const url = `/api/youtube/duration?videoId=${trailer.key}`;
        console.log('[Hero Section] Request URL:', url);
        
        const response = await fetch(url);
        console.log('[Hero Section] Response status:', response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[Hero Section] Response data:', data);
          
          if (data.duration && data.duration > 0) {
            console.log('[Hero Section] Successfully got trailer duration:', data.duration, 'seconds');
            setTrailerDuration(data.duration);
          } else {
            console.warn('[Hero Section] No duration in response or duration is 0');
            if (data.debug) {
              console.warn('[Hero Section] Debug info:', data.debug);
            }
            setTrailerDuration(null);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('[Hero Section] API request failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          setTrailerDuration(null);
        }
      } catch (error) {
        console.error('[Hero Section] Error fetching trailer duration:', error);
        if (error instanceof Error) {
          console.error('[Hero Section] Error message:', error.message);
          console.error('[Hero Section] Error stack:', error.stack);
        }
        setTrailerDuration(null);
      }
    };

    fetchTrailerDuration();
  }, [trailer?.key, trailer?.runtime]);

  // Format trailer duration for display (in seconds)
  const formatTrailerDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const trailerDurationText = trailerDuration ? formatTrailerDuration(trailerDuration) : null;

  const videoStatLabel = formatStatLabel(videoCount, "Videos");
  const photoStatLabel = formatStatLabel(photoCount, "Photos");

  const photoItems =
    [
      ...(details?.images?.backdrops ?? []),
      ...(details?.images?.posters ?? []),
      ...(details?.images?.stills ?? []),
    ].filter((img) => !!img?.file_path) ?? [];

  const photoMediaItems = photoItems.map((photo) => ({
    type: "image" as const,
    data: { file_path: photo.file_path },
  }));

  const handleOpenTrailerModal = (preferredVideoId?: string | null) => {
    setInitialVideoId(preferredVideoId ?? null);
    setIsTrailerOpen(true);
  };

  const handleCloseTrailerModal = () => {
    setIsTrailerOpen(false);
    setInitialVideoId(null);
  };

  return (
    <section className="-mt-[65px] pt-16 sm:pt-20 pb-0 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-end gap-3 mt-[14px] md:mt-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <CircleActionButton
                  size="md"
                  aria-label="Toggle favorite"
                  onClick={async () => {
                    await toggleFavorite.toggle(item, type);
                  }}
                >
                  <Heart
                    className={cn(
                      "h-5 w-5",
                      toggleFavorite.isFavorite(item.id, type)
                        ? "text-red-500 fill-red-500"
                        : "text-white"
                    )}
                  />
                </CircleActionButton>
              </TooltipTrigger>
              <TooltipContent>
                {toggleFavorite.isFavorite(item.id, type) ? "Remove from favorites" : "Add to favorites"}
              </TooltipContent>
            </Tooltip>
            <span className="h-6 w-px bg-white/20" />
            <LogToDiaryDropdown
              item={item}
              type={type}
              trigger={
                <Button
                  size="sm"
                  className="inline-flex items-center gap-2 rounded-full bg-primary/85 text-primary-foreground hover:bg-primary px-4 py-2 cursor-pointer"
                >
                  <Clapperboard className="h-4 w-4" />
                  Log
                </Button>
              }
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-start sm:justify-between sm:items-center gap-3">
            <h1 className="text-[1.3rem] sm:text-3xl font-semibold text-foreground">{title}</h1>
            <div className="inline-flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {displayRating && displayRating > 0 && (
                <div className="flex items-center gap-2 text-foreground">
                  {ratingSource === "imdb" ? (
                    <IMDBBadge size={24} />
                  ) : (
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  )}
                  <span className="font-semibold">{displayRating.toFixed(1)}</span>
                </div>
              )}
              {releaseYear && <span>{releaseYear}</span>}
              {runtimeText && <span>{runtimeText}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)_200px]">
          {/* Poster Column */}
          <div className="relative hidden lg:block rounded-lg rounded-tl-none bg-muted/20 overflow-hidden aspect-[2/3] border border-white/10">
            {posterPath ? (
              <Image
                src={getPosterUrl(posterPath, "w500")}
                alt={title}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                No Image
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

            {/* Watchlist Icon - Top Left */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={async () => {
                    await toggleWatchlist.toggle(item, type);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={toggleWatchlist.isInWatchlist(item.id, type) ? "Remove from watchlist" : "Add to watchlist"}
                  className="absolute -top-[10px] -left-[12px] z-10 flex items-center justify-center cursor-pointer"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleWatchlist.toggle(item, type);
                    }
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    <ImBookmark
                      className={cn(
                        "w-16 h-21",
                        toggleWatchlist.isInWatchlist(item.id, type)
                          ? "text-[#E0B416] fill-[#E0B416]"
                          : "text-black/80 fill-black/80"
                      )}
                    />
                    {toggleWatchlist.isInWatchlist(item.id, type) ? (
                      <Check className="absolute top-5 size-7 text-black z-10" />
                    ) : (
                      <Plus className="absolute top-5 size-7 text-white z-10" />
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {toggleWatchlist.isInWatchlist(item.id, type) ? "Remove from watchlist" : "Add to watchlist"}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Banner Column */}
          <div className="relative rounded-lg rounded-tl-none lg:rounded-tl-lg bg-muted/20 overflow-hidden min-h-[260px] md:min-h-[400px] lg:min-h-[260px] border border-white/10">
            {backdropPath ? (
              <Image
                src={getBackdropUrl(backdropPath, "w1280")}
                alt={`${title} backdrop`}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 bg-muted" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

            {/* Watchlist Icon - Top Left (Mobile only) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={async () => {
                    await toggleWatchlist.toggle(item, type);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={toggleWatchlist.isInWatchlist(item.id, type) ? "Remove from watchlist" : "Add to watchlist"}
                  className="absolute top-0 -left-[9px] z-10 flex items-center justify-center cursor-pointer lg:hidden"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleWatchlist.toggle(item, type);
                    }
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    <ImBookmark
                      className={cn(
                        "h-[44px] w-[44px]",
                        toggleWatchlist.isInWatchlist(item.id, type)
                            ? "text-[#E0B416] fill-[#E0B416]"
                          : "text-black/80 fill-black/80"
                      )}
                    />
                    {toggleWatchlist.isInWatchlist(item.id, type) ? (
                      <Check className="absolute top-[5px] size-6 text-black z-10" />
                    ) : (
                      <Plus className="absolute top-[5px] size-6 text-white z-10" />
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {toggleWatchlist.isInWatchlist(item.id, type) ? "Remove from watchlist" : "Add to watchlist"}
              </TooltipContent>
            </Tooltip>


            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex items-center gap-4">
                {posterPath && (
                  <div className="relative w-20 sm:w-24 aspect-[2/3] rounded-xl overflow-hidden border border-white/20 lg:hidden">
                    <Image
                      src={getPosterUrl(posterPath, "w500")}
                      alt={title}
                      fill
                      className="object-cover"
                      sizes="96px"
                      unoptimized
                    />
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                  <button
                    onClick={() => trailer && handleOpenTrailerModal(trailer?.id)}
                    disabled={!trailer}
                    className={cn(
                      "flex items-center justify-center h-16 w-16 rounded-full border-2 border-white/60 bg-white/10 backdrop-blur hover:bg-white/20 transition cursor-pointer",
                      !trailer && "opacity-60 cursor-not-allowed"
                    )}
                    aria-label="Play trailer"
                  >
                    <Play className="h-7 w-7 text-white fill-white" />
                  </button>
                  {trailer && (
                    <div className="flex flex-col gap-1">
                      <p className="text-white font-semibold text-lg">Play Trailer</p>
                      {trailerDurationText && (
                        <p className="text-white/80 text-sm">{trailerDurationText}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Column */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <HeroStatCard
              icon={<Clapperboard className="h-6 w-6 text-primary" />}
              value={videoStatLabel}
              onClick={videoCount > 0 ? () => handleOpenTrailerModal(null) : undefined}
              disabled={videoCount === 0}
            />
            <HeroStatCard
              icon={<Images className="h-6 w-6 text-primary" />}
              value={photoStatLabel}
              onClick={photoMediaItems.length > 0 ? () => setIsPhotosModalOpen(true) : undefined}
              disabled={photoMediaItems.length === 0}
            />
          </div>
        </div>
      </div>

      {(trailer || videosData) && (
        <TrailerModal
          video={trailer}
          videos={videosData?.results || []}
          isOpen={isTrailerOpen}
          onClose={handleCloseTrailerModal}
          title={title}
          initialVideoId={initialVideoId ?? trailer?.id ?? null}
        />
      )}

      {photoMediaItems.length > 0 && (
        <MediaModal
          items={photoMediaItems}
          initialIndex={0}
          isOpen={isPhotosModalOpen}
          onClose={() => setIsPhotosModalOpen(false)}
          title={title}
        />
      )}
    </section>
  );
}

function formatStatLabel(count: number, label: string) {
  const value = count <= 0 ? "0" : count > 99 ? "99+" : String(count);
  return `${value} ${label}`;
}

function HeroStatCard({
  icon,
  value,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  value: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const content = (
    <>
      {icon}
      <p className="text-lg lg:text-xl font-semibold text-foreground">{value}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "rounded-lg border border-border bg-card/80 dark:bg-card/40 p-4 lg:p-6 flex flex-col items-center justify-center gap-3 text-center transition hover:bg-card dark:hover:bg-card/60 cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed hover:bg-card/80 dark:hover:bg-card/40"
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card/80 dark:bg-card/40 p-4 lg:p-6 flex flex-col items-center justify-center gap-3 text-center">
      {content}
    </div>
  );
}

