"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Plus, Heart, BookOpen, Star, Volume2, VolumeX } from "lucide-react";
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
    <div className="relative w-full h-[85vh] min-h-[600px] overflow-hidden -mt-[65px]">
      {/* Backdrop/Video */}
      <div className="absolute inset-0">
        {trailer && videosData ? (
          <div className="absolute inset-0">
            <iframe
              src={getYouTubeEmbedUrl(trailer.key, true, isMuted)}
              className="w-full h-full scale-110"
              allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ pointerEvents: "none" }}
              title="Trailer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none" />
          </div>
        ) : backdropPath ? (
          <>
            <Image
              src={getBackdropUrl(backdropPath, "w1280")}
              alt={title}
              fill
              className="object-cover scale-110"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
      </div>

      {/* Content Overlay - Netflix style bottom positioning */}
      <div className="absolute inset-0 flex items-end z-10">
        <div className="w-full px-6 sm:px-8 lg:px-16 pb-20 lg:pb-24">
          <div className="max-w-4xl">
            {/* Title - Larger, bolder */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 drop-shadow-2xl leading-tight">
              {title}
            </h1>

            {/* Metadata Row */}
            <div className="flex items-center gap-4 mb-6 flex-wrap text-white/95">
              {item.vote_average > 0 && (
                <div className="flex items-center gap-2">
                  <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
                  <span className="font-bold text-lg">{item.vote_average.toFixed(1)}</span>
                </div>
              )}
              {releaseDate && (
                <span className="text-lg font-medium">{new Date(releaseDate).getFullYear()}</span>
              )}
              {runtime && (
                <span className="text-lg font-medium">{runtime}</span>
              )}
              {genres.length > 0 && (
                <>
                  <span className="text-white/60">•</span>
                  <span className="text-lg font-medium">{genres[0]?.name}</span>
                </>
              )}
            </div>

            {/* Description - Netflix style */}
            {item.overview && (
              <p className="text-lg text-white/90 mb-8 max-w-2xl line-clamp-3 drop-shadow-lg leading-relaxed">
                {item.overview}
              </p>
            )}

            {/* Action Buttons - Netflix style */}
            <div className="flex items-center gap-4 flex-wrap">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/80 h-14 px-10 font-bold text-lg rounded-md shadow-lg hover:shadow-xl transition-all"
                asChild
              >
                <Link href={`/${type}/${item.id}`}>
                  <Play className="size-6 mr-2 fill-black" />
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
                    className="bg-white/15 border-white/40 text-white hover:bg-white/25 h-14 w-14 rounded-full backdrop-blur-md border-2"
                  >
                    <Plus className="size-6" />
                  </Button>
                }
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/15 border-white/40 text-white hover:bg-white/25 h-14 w-14 rounded-full backdrop-blur-md border-2"
                    onClick={async () => {
                      await toggleFavorite.toggle(item, type);
                    }}
                  >
                    <Heart
                      className={cn(
                        "size-6",
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
                    className="bg-white/15 border-white/40 text-white hover:bg-white/25 h-14 w-14 rounded-full backdrop-blur-md border-2"
                  >
                    <BookOpen className="size-6" />
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
                      className="bg-white/15 border-white/40 text-white hover:bg-white/25 h-14 w-14 rounded-full backdrop-blur-md border-2"
                      onClick={() => setIsMuted(!isMuted)}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <VolumeX className="size-6" />
                      ) : (
                        <Volume2 className="size-6" />
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

