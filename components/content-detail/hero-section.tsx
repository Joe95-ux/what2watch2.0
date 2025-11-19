"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, Heart, Bookmark, Plus, Clapperboard, Images, Star } from "lucide-react";
import {
  TMDBMovie,
  TMDBSeries,
  TMDBVideo,
  getPosterUrl,
  getBackdropUrl,
} from "@/lib/tmdb";
import AddToPlaylistDropdown from "@/components/playlists/add-to-playlist-dropdown";
import { useToggleFavorite } from "@/hooks/use-favorites";
import { useToggleWatchlist } from "@/hooks/use-watchlist";
import { cn } from "@/lib/utils";
import TrailerModal from "@/components/browse/trailer-modal";
import { CircleActionButton } from "@/components/browse/circle-action-button";

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

  const formatRuntime = (minutes: number | number[] | undefined): string | null => {
    if (!minutes) return null;
    if (Array.isArray(minutes)) {
      return `${minutes[0]} min`;
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
      ? formatRuntime(details?.runtime)
      : formatRuntime(details?.episode_run_time);

  const trailerDurationText = trailer?.runtime
    ? formatTrailerDuration(trailer.runtime)
    : null;

  const formattedVideoCount = formatCount(videoCount);
  const formattedPhotoCount = formatCount(photoCount);

  return (
    <section className="-mt-[65px] pt-16 sm:pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[32px] bg-gradient-to-b from-background via-background/80 to-background px-6 sm:px-8 lg:px-12 py-10 space-y-8 border border-border/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)_240px]">
            {/* Poster Column */}
            <div className="relative rounded-3xl bg-muted overflow-hidden aspect-[2/3]">
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

              <div className="absolute top-4 left-4 flex gap-2">
                <CircleActionButton
                  size="sm"
                  onClick={async () => {
                    await toggleWatchlist.toggle(item, type);
                  }}
                >
                  <Bookmark
                    className={cn(
                      "h-4 w-4",
                      toggleWatchlist.isInWatchlist(item.id, type)
                        ? "text-blue-500 fill-blue-500"
                        : "text-white"
                    )}
                  />
                </CircleActionButton>
                <CircleActionButton
                  size="sm"
                  onClick={async () => {
                    await toggleFavorite.toggle(item, type);
                  }}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      toggleFavorite.isFavorite(item.id, type)
                        ? "text-red-500 fill-red-500"
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
                    <CircleActionButton size="sm">
                      <Plus className="h-4 w-4 text-white" />
                    </CircleActionButton>
                  }
                />
              </div>
            </div>

            {/* Banner Column */}
            <div className="relative rounded-3xl bg-muted overflow-hidden min-h-[260px]">
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

              <div className="absolute bottom-6 left-6 flex items-center gap-4">
                <button
                  onClick={() => trailer && setIsTrailerOpen(true)}
                  disabled={!trailer}
                  className={cn(
                    "flex items-center justify-center h-16 w-16 rounded-full border-2 border-white/60 bg-white/10 backdrop-blur hover:bg-white/20 transition",
                    !trailer && "opacity-60 cursor-not-allowed"
                  )}
                  aria-label="Play trailer"
                >
                  <Play className="h-7 w-7 text-white fill-white" />
                </button>
                <div>
                  <p className="text-white font-semibold text-lg">Play Trailer</p>
                  <p className="text-white/80 text-sm">
                    {trailer
                      ? trailerDurationText ?? "Runtime unavailable"
                      : "Trailer not available"}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Column */}
            <div className="grid gap-4">
              <div className="rounded-3xl border border-border bg-card/60 p-6 flex flex-col gap-3">
                <Clapperboard className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Videos</p>
                  <p className="text-2xl font-semibold">{formattedVideoCount}</p>
                </div>
              </div>
              <div className="rounded-3xl border border-border bg-card/60 p-6 flex flex-col gap-3">
                <Images className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Photos</p>
                  <p className="text-2xl font-semibold">
                    {formattedPhotoCount}
                    <span className="text-base font-medium text-muted-foreground ml-2">
                      {photoCount > 0 ? "photos" : ""}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {trailer && (
        <TrailerModal
          video={trailer}
          videos={videosData?.results || []}
          isOpen={isTrailerOpen}
          onClose={() => setIsTrailerOpen(false)}
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

function formatCount(count: number) {
  if (!count || count <= 0) return "0";
  if (count > 99) return "99+";
  return String(count);
}

