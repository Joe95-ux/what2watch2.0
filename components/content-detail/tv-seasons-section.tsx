"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { getPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface TVSeasonsSectionProps {
  seasons: Array<{
    id: number;
    name: string;
    overview: string;
    season_number: number;
    episode_count: number;
    air_date: string | null;
    poster_path: string | null;
  }>;
  selectedSeason: number | null;
  onSeasonSelect: (seasonNumber: number) => void;
  seasonDetails: {
    _id: string;
    air_date: string | null;
    episodes: Array<{
      id: number;
      name: string;
      overview: string;
      episode_number: number;
      season_number: number;
      air_date: string | null;
      still_path: string | null;
      runtime: number | null;
      vote_average: number;
      vote_count: number;
    }>;
    name: string;
    overview: string;
    id: number;
    poster_path: string | null;
    season_number: number;
  } | null | undefined;
  isLoadingSeasonDetails?: boolean;
}

export default function TVSeasonsSection({
  seasons,
  selectedSeason,
  onSeasonSelect,
  seasonDetails,
  isLoadingSeasonDetails = false,
}: TVSeasonsSectionProps) {
  // Filter out season 0 (specials)
  const regularSeasons = seasons.filter((s) => s.season_number > 0);

  // Auto-select first season if none selected
  useEffect(() => {
    if (regularSeasons.length > 0 && selectedSeason === null) {
      onSeasonSelect(regularSeasons[0].season_number);
    }
  }, [regularSeasons, selectedSeason, onSeasonSelect]);

  const handleSeasonSelect = useCallback((e: React.MouseEvent, seasonNumber: number) => {
    e.preventDefault();
    e.stopPropagation();
    onSeasonSelect(seasonNumber);
  }, [onSeasonSelect]);

  const handleEpisodeClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold mb-6">Seasons & Episodes</h2>

      {/* Season Selector - Carousel */}
      <div className="relative group/carousel mb-6">
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 3,
            breakpoints: {
              "(max-width: 640px)": { slidesToScroll: 2 },
              "(max-width: 1024px)": { slidesToScroll: 3 },
            },
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 gap-2">
            {regularSeasons.map((season) => (
              <CarouselItem key={season.id} className="pl-2 basis-auto">
                <button
                  onClick={(e) => handleSeasonSelect(e, season.season_number)}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap cursor-pointer h-[42px]",
                    selectedSeason === season.season_number
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {season.name || `Season ${season.season_number}`}
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious 
            className="left-0 h-[42px] w-[45px] rounded-l-md rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
          <CarouselNext 
            className="right-0 h-[42px] w-[45px] rounded-r-md rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
        </Carousel>
      </div>

      {/* Episodes Table */}
      {selectedSeason !== null && (
        <div className="mt-6">
          {isLoadingSeasonDetails ? (
            <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : seasonDetails && seasonDetails.episodes && seasonDetails.episodes.length > 0 ? (
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        #
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[300px]">
                        Title
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Air Date
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Runtime
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Rating
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {seasonDetails.episodes.map((episode) => (
                      <tr
                        key={episode.id}
                        className="hover:bg-muted/20 transition-colors cursor-pointer group"
                        onClick={handleEpisodeClick}
                      >
                        <td className="px-4 py-4 text-sm font-medium text-muted-foreground">
                          {episode.episode_number}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {episode.still_path ? (
                              <div className="relative w-20 h-12 rounded overflow-hidden flex-shrink-0 bg-muted">
                                <Image
                                  src={getPosterUrl(episode.still_path, "w300")}
                                  alt={episode.name}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-20 h-12 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">No Image</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                                {episode.name}
                              </p>
                              {episode.overview && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {episode.overview}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">
                          {episode.air_date
                            ? new Date(episode.air_date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "TBA"}
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">
                          {episode.runtime ? `${episode.runtime} min` : "N/A"}
                        </td>
                        <td className="px-4 py-4">
                          {episode.vote_average > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                              <span className="text-sm font-medium">{episode.vote_average.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
              No episodes available for this season.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

