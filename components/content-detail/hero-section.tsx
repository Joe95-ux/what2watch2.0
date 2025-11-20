"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Play, Heart, Bookmark, Plus, Clapperboard, Images, Star } from "lucide-react";
import {
  TMDBMovie,
  TMDBSeries,
  TMDBVideo,
  getPosterUrl,
  getBackdropUrl,
} from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import AddToPlaylistDropdown from "@/components/playlists/add-to-playlist-dropdown";
import { useToggleFavorite } from "@/hooks/use-favorites";
import { useToggleWatchlist } from "@/hooks/use-watchlist";
import { cn } from "@/lib/utils";
import TrailerModal from "@/components/browse/trailer-modal";
import { CircleActionButton } from "@/components/browse/circle-action-button";
import LogToDiaryDropdown from "@/components/browse/log-to-diary-dropdown";
import MediaModal from "./media-modal";

interface DetailsType {
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  genres?: Array<{ id: number; name: string }>;
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

  const trailerDurationText = trailer?.runtime
    ? formatTrailerDuration(trailer.runtime)
    : null;

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
    <section className="-mt-[65px] pt-16 sm:pt-20 pb-12 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-end gap-3 mt-[14px] md:mt-0">
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
            <span className="h-6 w-px bg-white/20" />
            <LogToDiaryDropdown
              item={item}
              type={type}
              trigger={
                <Button
                  size="sm"
                  className="inline-flex items-center gap-2 rounded-full bg-primary/85 text-primary-foreground hover:bg-primary px-4 py-2"
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
              {item.vote_average > 0 && (
                <div className="flex items-center gap-2 text-foreground">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold">{item.vote_average.toFixed(1)}</span>
                </div>
              )}
              {releaseYear && <span>{releaseYear}</span>}
              {runtimeText && <span>{runtimeText}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)_200px]">
          {/* Poster Column */}
          <div className="relative hidden lg:block rounded-lg bg-muted/20 overflow-hidden aspect-[2/3] border border-white/10">
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

            <div className="absolute top-4 left-4 flex gap-3">
              <CircleActionButton
                size="lg"
                className="bg-black/70 text-white border-white/30 hover:bg-black/80 hover:border-white/60 shadow-lg"
                onClick={async () => {
                  await toggleWatchlist.toggle(item, type);
                }}
                aria-label="Toggle watchlist"
              >
                <Bookmark
                  className={cn(
                    "h-5 w-5",
                    toggleWatchlist.isInWatchlist(item.id, type)
                      ? "text-blue-500 fill-blue-500"
                      : "text-white"
                  )}
                />
              </CircleActionButton>
            </div>

            <div className="absolute top-4 right-4">
              <AddToPlaylistDropdown
                item={item}
                type={type}
                trigger={
                  <CircleActionButton
                    size="lg"
                    className="bg-black/70 text-white border-white/30 hover:bg-black/80 hover:border-white/60 shadow-lg"
                    aria-label="Add to playlist"
                  >
                    <Plus className="h-5 w-5 text-white" />
                  </CircleActionButton>
                }
              />
            </div>
          </div>

          {/* Banner Column */}
          <div className="relative rounded-lg bg-muted/20 overflow-hidden min-h-[260px] border border-white/10">
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
                    <div className="absolute top-2 right-2 flex gap-2">
                      <CircleActionButton
                        size="md"
                        className="bg-black/70 text-white border-white/30 hover:bg-black/80 hover:border-white/60 shadow-lg"
                        aria-label="Toggle watchlist"
                        onClick={async () => {
                          await toggleWatchlist.toggle(item, type);
                        }}
                      >
                        <Bookmark
                          className={cn(
                            "h-4 w-4",
                            toggleWatchlist.isInWatchlist(item.id, type)
                              ? "text-blue-400 fill-blue-400"
                              : "text-white"
                          )}
                        />
                      </CircleActionButton>
                      <AddToPlaylistDropdown
                        item={item}
                        type={type}
                        trigger={
                          <CircleActionButton
                            size="md"
                            className="bg-black/70 text-white border-white/30 hover:bg-black/80 hover:border-white/60 shadow-lg"
                            aria-label="Add to playlist"
                          >
                            <Plus className="h-4 w-4 text-white" />
                          </CircleActionButton>
                        }
                      />
                    </div>
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

function formatTrailerDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
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

