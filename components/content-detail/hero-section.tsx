"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Plus, Heart, BookOpen, Star, Clock, Calendar, Volume2, VolumeX } from "lucide-react";
import { TMDBMovie, TMDBSeries, getBackdropUrl, getYouTubeEmbedUrl, TMDBVideo } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import AddToPlaylistDropdown from "@/components/playlists/add-to-playlist-dropdown";
import LogToDiaryDropdown from "@/components/browse/log-to-diary-dropdown";
import { useToggleFavorite } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

interface DetailsType {
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  genres?: Array<{ id: number; name: string }>;
}

interface HeroSectionProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  details: DetailsType | null;
  trailer: TMDBVideo | null;
  videosData: { id: number; results: TMDBVideo[] } | null;
}

export default function HeroSection({ item, type, details, trailer, videosData }: HeroSectionProps) {
  const [isMuted, setIsMuted] = useState(true);
  const toggleFavorite = useToggleFavorite();

  const title = type === "movie" ? (item as TMDBMovie).title : (item as TMDBSeries).name;
  const backdropPath = item.backdrop_path || item.poster_path;

  // Format runtime
  const formatRuntime = (minutes: number | number[] | undefined): string => {
    if (!minutes) return "N/A";
    if (Array.isArray(minutes)) {
      return `${minutes[0]} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Format date
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const releaseDate = type === "movie" 
    ? (details?.release_date ? formatDate(details.release_date) : null)
    : (details?.first_air_date ? formatDate(details.first_air_date) : null);

  const runtime = type === "movie"
    ? (details?.runtime ? formatRuntime(details.runtime) : null)
    : (details?.episode_run_time?.[0] ? formatRuntime(details.episode_run_time[0]) : null);

  const genres = details?.genres || [];

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Backdrop/Video */}
      <div className="absolute inset-0">
        {trailer && videosData ? (
          <div className="absolute inset-0">
            <iframe
              src={getYouTubeEmbedUrl(trailer.key, true, isMuted)}
              className="w-full h-full"
              allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ pointerEvents: "none" }}
              title="Trailer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none" />
          </div>
        ) : backdropPath ? (
          <>
            <Image
              src={getBackdropUrl(backdropPath, "w1280")}
              alt={title}
              fill
              className="object-cover"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/80 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-end z-10">
        <div className="w-full px-6 sm:px-8 lg:px-12 pb-16">
          <div className="max-w-4xl">
            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-2xl">
              {title}
            </h1>

            {/* Metadata */}
            <div className="flex items-center gap-4 mb-6 flex-wrap text-white/90">
              {item.vote_average > 0 && (
                <div className="flex items-center gap-1.5">
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold">{item.vote_average.toFixed(1)}</span>
                </div>
              )}
              {runtime && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{runtime}</span>
                </div>
              )}
              {releaseDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{releaseDate}</span>
                </div>
              )}
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex gap-2 mb-8 flex-wrap">
                {genres.slice(0, 5).map((genre: { id: number; name: string }) => (
                  <span
                    key={genre.id}
                    className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm border border-white/20"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90 h-12 px-8 font-semibold rounded-md"
                asChild
              >
                <Link href={`/${type}/${item.id}`}>
                  <Play className="size-5 mr-2 fill-black" />
                  Play
                </Link>
              </Button>

              <AddToPlaylistDropdown
                item={item}
                type={type}
                trigger={
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 h-12 w-12 rounded-full backdrop-blur-sm"
                  >
                    <Plus className="size-5" />
                  </Button>
                }
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 h-12 w-12 rounded-full backdrop-blur-sm"
                    onClick={async () => {
                      await toggleFavorite.toggle(item, type);
                    }}
                  >
                    <Heart
                      className={cn(
                        "size-5",
                        toggleFavorite.isFavorite(item.id, type)
                          ? "text-red-500 fill-red-500"
                          : "text-white"
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{toggleFavorite.isFavorite(item.id, type) ? "Remove from My List" : "Add to My List"}</p>
                </TooltipContent>
              </Tooltip>

              <LogToDiaryDropdown
                item={item}
                type={type}
                trigger={
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 h-12 w-12 rounded-full backdrop-blur-sm"
                  >
                    <BookOpen className="size-5" />
                  </Button>
                }
              />

              {/* Mute/Unmute Toggle - Only show when trailer is available */}
              {trailer && videosData && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      variant="outline"
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20 h-12 w-12 rounded-full backdrop-blur-sm ml-auto"
                      onClick={() => setIsMuted(!isMuted)}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <VolumeX className="size-5" />
                      ) : (
                        <Volume2 className="size-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isMuted ? "Unmute" : "Mute"}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

