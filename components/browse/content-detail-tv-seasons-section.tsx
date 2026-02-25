"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Star, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { TMDBSeries, getPosterUrl } from "@/lib/tmdb";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSeenEpisodes, useToggleEpisodeSeen, useMarkSeasonsSeen, useUnmarkSeasonsSeen } from "@/hooks/use-episode-tracking";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

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
  tvShow?: TMDBSeries;
  onEpisodeClick?: (episode: {
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
  }) => void;
}

export default function TVSeasonsSection({
  seasons,
  selectedSeason,
  onSeasonSelect,
  seasonDetails,
  isLoadingSeasonDetails = false,
  tvShow,
  onEpisodeClick,
}: TVSeasonsSectionProps) {
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const isMobile = useIsMobile();
  const { data: seenEpisodes = [] } = useSeenEpisodes(tvShow?.id || null);
  const toggleEpisodeSeen = useToggleEpisodeSeen();
  const markSeasonsSeen = useMarkSeasonsSeen();
  const unmarkSeasonsSeen = useUnmarkSeasonsSeen();
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);

  const promptSignIn = (message?: string) => {
    toast.info(message ?? "Please sign in to perform this action.");
    if (openSignIn) {
      openSignIn({
        afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
      });
    }
  };

  // Filter out season 0 (specials)
  const regularSeasons = seasons.filter((s) => s.season_number > 0);

  // Auto-select first season if none selected
  useEffect(() => {
    if (regularSeasons.length > 0 && selectedSeason === null && onSeasonSelect) {
      onSeasonSelect(regularSeasons[0].season_number);
    }
  }, [regularSeasons, selectedSeason, onSeasonSelect]);

  // Reset showAllEpisodes when season changes
  useEffect(() => {
    setShowAllEpisodes(false);
  }, [selectedSeason]);

  const isEpisodeSeen = (episodeId: number) => {
    return seenEpisodes.includes(episodeId);
  };

  // Check if all episodes in the current season are seen
  const areAllSeasonEpisodesSeen = () => {
    if (!seasonDetails || !seasonDetails.episodes || selectedSeason === null) {
      return false;
    }
    return seasonDetails.episodes.every((episode) => isEpisodeSeen(episode.id));
  };

  const handleToggleEpisodeSeen = async (episode: {
    id: number;
    season_number: number;
    episode_number: number;
  }) => {
    if (!isSignedIn || !tvShow) {
      promptSignIn("Sign in to track episodes you've watched.");
      return;
    }
    const isSeen = isEpisodeSeen(episode.id);
    await toggleEpisodeSeen.mutateAsync({
      tvShowTmdbId: tvShow.id,
      tvShowTitle: tvShow.name,
      episodeId: episode.id,
      seasonNumber: episode.season_number,
      episodeNumber: episode.episode_number,
      isSeen: isSeen,
    });
  };

  const handleToggleSeasonSeenAll = async (checked: boolean) => {
    if (selectedSeason === null || !tvShow) {
      return;
    }
    if (!isSignedIn) {
      promptSignIn("Sign in to track seasons you've watched.");
      return;
    }
    
    if (checked) {
      await markSeasonsSeen.mutateAsync({
        tvShowTmdbId: tvShow.id,
        tvShowTitle: tvShow.name,
        seasonNumbers: [selectedSeason],
      });
    } else {
      await unmarkSeasonsSeen.mutateAsync({
        tvShowTmdbId: tvShow.id,
        seasonNumbers: [selectedSeason],
      });
    }
  };

  // Handle season selection with propagation prevention
  const handleSeasonSelect = useCallback((e: React.MouseEvent, seasonNumber: number) => {
    e.preventDefault();
    e.stopPropagation();
    onSeasonSelect(seasonNumber);
  }, [onSeasonSelect]);

  // Handle episode row click with propagation prevention
  const handleEpisodeClick = useCallback((e: React.MouseEvent, episode: {
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
  }) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEpisodeClick) {
      onEpisodeClick(episode);
    }
  }, [onEpisodeClick]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Seasons & Episodes</h3>
      
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
                    "relative py-4 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
                    selectedSeason === season.season_number
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {season.name || `Season ${season.season_number}`}
                  {selectedSeason === season.season_number && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
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

      {/* Episodes - Card Design */}
      {selectedSeason !== null && (
        <div className="space-y-4">
          {isLoadingSeasonDetails ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : seasonDetails && seasonDetails.episodes && seasonDetails.episodes.length > 0 ? (
            <div className="space-y-4">
              {/* Seen All Checkbox */}
              {tvShow && (
                <div className="flex items-center space-x-2 pb-2">
                  <Checkbox
                    id="seen-all-season"
                    checked={areAllSeasonEpisodesSeen()}
                    onCheckedChange={handleToggleSeasonSeenAll}
                    disabled={!isSignedIn || markSeasonsSeen.isPending || unmarkSeasonsSeen.isPending}
                    className="cursor-pointer"
                  />
                  <Label
                    htmlFor="seen-all-season"
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    Seen All
                    {(markSeasonsSeen.isPending || unmarkSeasonsSeen.isPending) && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                  </Label>
                </div>
              )}
              
              {/* Display first 10 episodes or all based on toggle */}
              {(() => {
                const allEpisodes = seasonDetails.episodes;
                const displayedEpisodes = showAllEpisodes ? allEpisodes : allEpisodes.slice(0, 10);
                const hasMoreEpisodes = allEpisodes.length > 10;
                
                return (
                  <>
                    {displayedEpisodes.map((episode) => (
                      <div
                        key={episode.id}
                        className={cn(
                          "relative flex rounded-lg border border-border transition-all group cursor-pointer overflow-hidden",
                          isMobile && "flex-col"
                        )}
                        onClick={(e) => handleEpisodeClick(e, episode)}
                      >
                        {episode.still_path ? (
                          <div className={cn(
                            "relative w-28 sm:w-34 rounded-l-lg overflow-hidden flex-shrink-0 bg-muted",
                            isMobile && "w-full h-[220px] rounded-t-lg rounded-l-none"
                          )}>
                            <Image
                              src={getPosterUrl(episode.still_path, "w300")}
                              alt={episode.name}
                              fill
                              className="object-cover"
                              sizes="96px"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className={cn(
                            "w-28 sm:w-34 rounded-l-lg bg-muted flex-shrink-0 flex items-center justify-center",
                            isMobile && "w-full h-[220px] rounded-t-lg rounded-l-none"
                          )}>
                            <span className="text-sm text-muted-foreground">No Image</span>
                          </div>
                        )}

                        <div className={cn(
                          "flex-1 min-w-0 flex flex-col p-6",
                          isMobile && "p-4"
                        )}>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-sm text-muted-foreground">
                              S{episode.season_number.toString().padStart(2, "0")}E{episode.episode_number.toString().padStart(2, "0")}
                            </span>
                            <h3 className="text-lg font-semibold truncate sm:truncate-none">
                              {episode.name}
                            </h3>
                            {tvShow && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleEpisodeSeen(episode);
                                    }}
                                    disabled={!isSignedIn || toggleEpisodeSeen.isPending}
                                    className="ml-auto flex-shrink-0 h-6 w-6 rounded-full border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Check className={cn("h-4 w-4 font-bold", isEpisodeSeen(episode.id) ? "text-green-500" : "text-muted-foreground")} strokeWidth={3} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isEpisodeSeen(episode.id) ? "Mark as not seen" : "Mark as seen"}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                            {episode.air_date && (
                              <span>{new Date(episode.air_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                            )}
                            {episode.runtime && (
                              <>
                                {episode.air_date && <span>•</span>}
                                <span>{episode.runtime} min</span>
                              </>
                            )}
                            {episode.vote_average > 0 && (
                              <>
                                {(episode.air_date || episode.runtime) && <span>•</span>}
                                <div className="flex items-center gap-1.5">
                                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                  <span className="font-semibold">{episode.vote_average.toFixed(1)}</span>
                                </div>
                              </>
                            )}
                          </div>

                          {episode.overview && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {episode.overview}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Show More/Less Toggle */}
                    {hasMoreEpisodes && (
                      <button
                        onClick={() => setShowAllEpisodes(!showAllEpisodes)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full justify-center py-2"
                      >
                        {showAllEpisodes ? (
                          <>
                            Show Less
                            <ChevronUp className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            Show More ({allEpisodes.length - 10} more)
                            <ChevronDown className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
              No episodes available for this season.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
