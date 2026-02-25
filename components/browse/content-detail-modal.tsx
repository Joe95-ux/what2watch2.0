"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { X, Play, Plus, Heart, Star, Clock, Volume2, VolumeX, ArrowLeft, BookOpen, BookCheck, CalendarIcon, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import Script from "next/script";
import { TMDBMovie, TMDBSeries, getBackdropUrl, getPosterUrl, getYouTubeEmbedUrl, TMDBVideo } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMovieDetails,
  useTVDetails,
  useContentVideos,
  useTVSeasons,
  useTVSeasonDetails,
  useSimilarMovies,
  useRecommendedMovies,
  useSimilarTV,
  useRecommendedTV,
  useOMDBData,
} from "@/hooks/use-content-details";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import VideosCarousel from "./videos-carousel";
import TrailerModal from "./trailer-modal";
import MoreLikeThis from "./more-like-this";
import EpisodeDetailModal from "@/components/content-detail/episode-detail-modal";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useAddRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useToggleFavorite } from "@/hooks/use-favorites";
import { useSeenEpisodes, useToggleEpisodeSeen, useMarkSeasonsSeen, useUnmarkSeasonsSeen } from "@/hooks/use-episode-tracking";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import AddToListDropdown from "@/components/content-detail/add-to-list-dropdown";
import LogToDiaryDropdown from "./log-to-diary-dropdown";
import { useWatchProviders } from "@/hooks/use-content-details";
import ContentDetailWhereToWatch from "./content-detail-where-to-watch";
import ContentDetailDetailsGrid from "./content-detail-details-grid";
import TVSeasonsSection from "./content-detail-tv-seasons-section";

interface ContentDetailModalProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  isOpen: boolean;
  onClose: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
  onNavigate?: (item: TMDBMovie | TMDBSeries, type: "movie" | "tv") => void;
}

export default function ContentDetailModal({
  item: initialItem,
  type: initialType,
  isOpen,
  onClose,
  showBackButton: externalShowBackButton = false,
  onBack: externalOnBack,
  onNavigate,
}: ContentDetailModalProps) {
  const router = useRouter();
  // Internal navigation state for More Like This
  const [currentItem, setCurrentItem] = useState(initialItem);
  const [currentType, setCurrentType] = useState(initialType);
  const [parentItem, setParentItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
  
  // Update current item when prop changes
  useEffect(() => {
    if (isOpen) {
      setCurrentItem(initialItem);
      setCurrentType(initialType);
      setParentItem(null);
      // Reset state when modal opens
      // Delay content rendering until Sheet animation completes to prevent flicker
      setIsSheetMounted(false);
      const timer = setTimeout(() => {
        setIsSheetMounted(true);
      }, 300); // 300ms delay - allows Sheet animation to start smoothly before content renders
      return () => clearTimeout(timer);
    } else {
      setIsSheetMounted(false);
    }
  }, [initialItem, initialType, isOpen]);
  
  const item = currentItem;
  const type = currentType;
  const hasParent = !!parentItem;
  const showBackButton = externalShowBackButton || hasParent;
  
  const handleBack = () => {
    if (externalOnBack) {
      externalOnBack();
    } else if (parentItem) {
      // Navigate back to parent item
      setCurrentItem(parentItem.item);
      setCurrentType(parentItem.type);
      setParentItem(null);
    }
  };
  
  const handleNavigate = (newItem: TMDBMovie | TMDBSeries, newType: "movie" | "tv") => {
    if (onNavigate) {
      onNavigate(newItem, newType);
    } else {
      // Internal navigation: store current as parent and navigate to new item
      setParentItem({ item: currentItem, type: currentType });
      setCurrentItem(newItem);
      setCurrentType(newType);
      setSelectedSeason(null); // Reset season selection for new item
    }
  };
  
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<TMDBVideo | null>(null);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay compatibility
  const [selectedEpisode, setSelectedEpisode] = useState<{
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
  } | null>(null);
  const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState(false);
  const isClosingRef = useRef(false);
  const [isSheetMounted, setIsSheetMounted] = useState(false);
  const [isHeroListDropdownOpen, setIsHeroListDropdownOpen] = useState(false);
  
  // Track recently viewed
  const addRecentlyViewed = useAddRecentlyViewed();
  const toggleFavorite = useToggleFavorite();

  // Fetch details based on type
  const { data: movieDetails, isLoading: isLoadingMovie } = useMovieDetails(
    type === "movie" ? item.id : null
  );
  const { data: tvDetails, isLoading: isLoadingTV } = useTVDetails(
    type === "tv" ? item.id : null
  );
  
  // Get IMDB ID from details (with type assertion for external_ids)
  const movieDetailsWithExternalIds = movieDetails as (typeof movieDetails & { external_ids?: { imdb_id?: string | null } }) | null | undefined;
  const tvDetailsWithExternalIds = tvDetails as (typeof tvDetails & { external_ids?: { imdb_id?: string | null } }) | null | undefined;
  const imdbId = type === "movie" 
    ? (movieDetailsWithExternalIds?.external_ids?.imdb_id || (movieDetailsWithExternalIds as any)?.imdb_id || null)
    : (tvDetailsWithExternalIds?.external_ids?.imdb_id || (tvDetailsWithExternalIds as any)?.imdb_id || null);


  // Consistent click handler to prevent propagation
  const handleButtonClick = useCallback((e: React.MouseEvent, callback: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  }, []);
  const { data: videosData } = useContentVideos(type, item.id);
  const { data: watchAvailability } = useWatchProviders(type, item.id, "US");
  const { data: seasonsData } = useTVSeasons(type === "tv" ? item.id : null);
  const { data: seasonDetails, isLoading: isLoadingSeasonDetails } = useTVSeasonDetails(
    type === "tv" ? item.id : null,
    selectedSeason
  );
  
  // Fetch similar/recommended content
  const { data: similarMovies, isLoading: isLoadingSimilarMovies } = useSimilarMovies(
    type === "movie" ? item.id : null
  );
  const { data: recommendedMovies, isLoading: isLoadingRecommendedMovies } = useRecommendedMovies(
    type === "movie" ? item.id : null
  );
  const { data: similarTV, isLoading: isLoadingSimilarTV } = useSimilarTV(
    type === "tv" ? item.id : null
  );
  const { data: recommendedTV, isLoading: isLoadingRecommendedTV } = useRecommendedTV(
    type === "tv" ? item.id : null
  );
  
  // Combine similar and recommended content (prioritize recommendations)
  // Fetch max 16 items for "More Like This" section
  const moreLikeThisItems = type === "movie"
    ? [...(recommendedMovies?.results || []), ...(similarMovies?.results || [])].slice(0, 16)
    : [...(recommendedTV?.results || []), ...(similarTV?.results || [])].slice(0, 16);
  
  const isLoadingMoreLikeThis = type === "movie"
    ? isLoadingRecommendedMovies || isLoadingSimilarMovies
    : isLoadingRecommendedTV || isLoadingSimilarTV;

  // Auto-select first season when seasons load
  useEffect(() => {
    if (type === "tv" && seasonsData && seasonsData.seasons.length > 0 && selectedSeason === null) {
      const firstRegularSeason = seasonsData.seasons.find((s) => s.season_number > 0);
      if (firstRegularSeason) {
        setSelectedSeason(firstRegularSeason.season_number);
      }
    }
  }, [type, seasonsData, selectedSeason]);

  // Track view when sheet opens
  useEffect(() => {
    if (isOpen) {
      const title = "title" in item ? item.title : item.name;
      addRecentlyViewed.mutate({
        tmdbId: item.id,
        mediaType: type,
        title: title,
        posterPath: item.poster_path || null,
        backdropPath: item.backdrop_path || null,
        releaseDate: "release_date" in item ? item.release_date || null : null,
        firstAirDate: "first_air_date" in item ? item.first_air_date || null : null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item.id, type]); // Only depend on isOpen, item.id, and type - mutation function is stable

  const details = type === "movie" ? movieDetails : tvDetails;
  const isLoading = type === "movie" ? isLoadingMovie : isLoadingTV;
  
  // Fetch OMDB data for ratings (using imdbId declared earlier)
  const { data: omdbData } = useOMDBData(imdbId);

  const title = "title" in item ? item.title : item.name;
  const backdropPath = item.backdrop_path || item.poster_path;
  const posterPath = item.poster_path;

  // Find trailer for hero section
  const trailer: TMDBVideo | null =
    videosData?.results?.find(
      (v: TMDBVideo) => v.type === "Trailer" && v.official && v.site === "YouTube"
    ) ||
    videosData?.results?.find(
      (v: TMDBVideo) => v.type === "Trailer" && v.site === "YouTube"
    ) ||
    null;

  // All videos for carousel
  const allVideos = videosData?.results || [];

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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Mark as closing to prevent immediate reopening
      isClosingRef.current = true;
      onClose();
      // Reset the flag after a short delay to allow normal interactions again
      setTimeout(() => {
        isClosingRef.current = false;
      }, 100);
    }
  };

  // Handle sheet content clicks to prevent propagation
  const handleSheetClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent 
        side="right"
        className="!w-full sm:!w-[90vw] lg:!w-[80vw] xl:!max-w-[60rem] !h-full overflow-y-auto p-0 gap-0 [&>button]:hidden"
        onClick={handleSheetClick}
        onInteractOutside={(e) => {
          // Prevent closing when clicking on interactive elements inside the sheet
          const target = e.target as HTMLElement;
          // Don't close if clicking on dropdown menu, popover content, or any interactive element
          if (target.closest('[role="menu"]') || 
              target.closest('[role="dialog"]') || 
              target.closest('[data-radix-popper-content-wrapper]') ||
              target.closest('.no-close') ||
              target.closest('button') ||
              target.closest('a') ||
              target.closest('[role="button"]')) {
            e.preventDefault();
            return;
          }
          // Allow normal close behavior for clicks outside
        }}
      >
        {/* Control Buttons - Wrapped in div to avoid [&>button]:hidden selector */}
        <div className="no-close">
          {/* Back Button (when opened from More Like This) */}
          {showBackButton && (
            <button
              onClick={(e) => handleButtonClick(e, handleBack)}
              className="absolute top-4 left-4 z-[100] h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-black/80 hover:bg-black/95 flex items-center justify-center transition-all shadow-xl backdrop-blur-sm cursor-pointer hover:scale-105 no-close"
              aria-label="Back"
            >
              <ArrowLeft className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </button>
          )}

          {/* Close Button - More Prominent */}
          <button
            onClick={(e) => handleButtonClick(e, onClose)}
            className="absolute top-4 right-4 z-[100] h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-black/80 hover:bg-black/95 flex items-center justify-center transition-all shadow-xl backdrop-blur-sm cursor-pointer hover:scale-105 no-close"
            aria-label="Close"
          >
            <X className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </button>
        </div>

        {/* Hero Section with Trailer/Backdrop */}
        <div className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
          {trailer && isOpen && videosData ? (
            <div className="absolute inset-0">
              {isOpen && (
                <iframe
                  key={`${trailer.key}-${isMuted}`}
                  src={getYouTubeEmbedUrl(trailer.key, true, isMuted)}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ pointerEvents: "none" }}
                  title="Trailer"
                />
              )}
              {isMuted && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none dark:from-black/90 dark:via-black/60" />
              )}
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
              {isMuted && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/80 to-transparent dark:from-black/90 dark:via-black/80" />
              )}
            </>
          ) : (
            <div className="absolute inset-0 bg-muted" />
          )}

          {/* Content Overlay - Hidden when audio is enabled */}
          {isMuted && (
            <div className="absolute inset-0 flex items-end z-10">
              <div className="w-full px-6 sm:px-8 lg:px-12 pb-12">
                <div className="max-w-3xl">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white drop-shadow-lg">
                    {title}
                  </h1>
                  <div className="flex items-center gap-4 mb-6 flex-wrap">
                    {(omdbData?.imdbRating || (item.vote_average > 0 && !omdbData?.imdbRating)) && (
                      <div className="flex items-center gap-1.5">
                        {omdbData?.imdbRating ? (
                          <IMDBBadge size={24} />
                        ) : (
                          <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                        )}
                        <span className="text-white/90 font-semibold">
                          {omdbData?.imdbRating ? omdbData.imdbRating.toFixed(1) : item.vote_average.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {details && (
                      <>
                        {type === "movie" && "runtime" in details && (
                          <div className="flex items-center gap-1.5 text-white/90">
                            <Clock className="h-4 w-4" />
                            <span>{formatRuntime(details.runtime)}</span>
                          </div>
                        )}
                        {type === "tv" && "episode_run_time" in details && details.episode_run_time?.[0] && (
                          <div className="flex items-center gap-1.5 text-white/90">
                            <Clock className="h-4 w-4" />
                            <span>{formatRuntime(details.episode_run_time[0])} per episode</span>
                          </div>
                        )}
                        {type === "movie" && "release_date" in details && (
                          <div className="flex items-center gap-1.5 text-white/90">
                            <CalendarIcon className="h-4 w-4" />
                            <span>{formatDate(details.release_date)}</span>
                          </div>
                        )}
                        {type === "tv" && "first_air_date" in details && (
                          <div className="flex items-center gap-1.5 text-white/90">
                            <CalendarIcon className="h-4 w-4" />
                            <span>{formatDate(details.first_air_date)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="lg"
                      className="bg-white dark:bg-white text-black dark:text-black hover:bg-white/90 dark:hover:bg-white/90 h-10 px-6 text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg rounded-md no-close"
                      asChild
                    >
                      <Link 
                        href={`/${type}/${item.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="no-close"
                      >
                        View More
                      </Link>
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-block pointer-events-none">
                          <AddToListDropdown
                            item={item}
                            type={type}
                            trigger={
                              <Button
                                size="lg"
                                variant="outline"
                                className="bg-white/10 dark:bg-white/10 text-white dark:text-white border-white/30 dark:border-white/30 hover:bg-white/20 dark:hover:bg-white/20 hover:border-white/50 dark:hover:border-white/50 p-5 rounded-[20px] backdrop-blur-sm transition-all duration-300 hover:scale-105 cursor-pointer no-close pointer-events-auto"
                                type="button"
                              >
                                <Plus className="size-5 md:size-6 text-white dark:text-white" />
                              </Button>
                            }
                            onOpenChange={(open) => {
                              setIsHeroListDropdownOpen(open);
                            }}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add to List</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="lg"
                          variant="outline"
                          className="bg-white/10 dark:bg-white/10 border-white/30 dark:border-white/30 hover:bg-white/20 dark:hover:bg-white/20 hover:border-white/50 dark:hover:border-white/50 p-5 rounded-[20px] backdrop-blur-sm transition-all duration-300 hover:scale-105 cursor-pointer no-close"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            await toggleFavorite.toggle(item, type);
                          }}
                        >
                          <Heart 
                            className={`size-5 md:size-6 ${
                              toggleFavorite.isFavorite(item.id, type)
                                ? "text-red-500 dark:text-red-500 fill-red-500 dark:fill-red-500"
                                : "text-white dark:text-white"
                            }`} 
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
                          className="bg-white/10 dark:bg-white/10 border-white/30 dark:border-white/30 hover:bg-white/20 dark:hover:bg-white/20 hover:border-white/50 dark:hover:border-white/50 p-5 rounded-[20px] backdrop-blur-sm transition-all duration-300 hover:scale-105 cursor-pointer no-close"
                          onClick={(e) => handleButtonClick(e, () => {})}
                        >
                          <BookOpen className="size-5 md:size-6 text-white dark:text-white" />
                        </Button>
                      }
                    />
                    {/* Mute/Unmute Toggle - Only show when trailer is available, on extreme right */}
                    {trailer && videosData && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="lg"
                            variant="outline"
                          className="bg-white/10 dark:bg-white/10 text-white dark:text-white border-white/30 dark:border-white/30 hover:bg-white/20 dark:hover:bg-white/20 hover:border-white/50 dark:hover:border-white/50 p-5 rounded-[20px] backdrop-blur-sm transition-all duration-300 hover:scale-105 ml-auto cursor-pointer no-close"
                            onClick={(e) => handleButtonClick(e, () => setIsMuted(!isMuted))}
                            aria-label={isMuted ? "Unmute" : "Mute"}
                          >
                            {isMuted ? (
                            <VolumeX className="size-5 md:size-6 text-white dark:text-white" />
                            ) : (
                            <Volume2 className="size-5 md:size-6 text-white dark:text-white" />
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
          )}

          {/* Clear Icon - Only show when audio is enabled (not muted) */}
          {!isMuted && trailer && videosData && (
            <div className="absolute inset-0 flex items-end justify-end z-10 pointer-events-none p-6 sm:p-8 lg:p-12">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/10 dark:bg-white/10 text-white dark:text-white border-white/30 dark:border-white/30 hover:bg-white/20 dark:hover:bg-white/20 hover:border-white/50 dark:hover:border-white/50 p-5 rounded-[20px] backdrop-blur-sm transition-all duration-300 hover:scale-105 cursor-pointer pointer-events-auto no-close"
                    onClick={(e) => handleButtonClick(e, () => setIsMuted(true))}
                    aria-label="Clear"
                  >
                    <BookCheck className="size-6 text-white dark:text-white" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Content */}
        {isSheetMounted && (
          <div className="bg-background">
            <div className="px-6 sm:px-8 lg:px-12 py-8">
              {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Tagline */}
                  {details && "tagline" in details && details.tagline && typeof details.tagline === "string" && (
                    <div>
                      <p className="text-lg font-medium italic text-foreground/80">
                        {details.tagline}
                      </p>
                    </div>
                  )}
                  
                  {/* Overview */}
                  {item.overview && (
                    <div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {item.overview}
                      </p>
                    </div>
                  )}

                  {/* Genres */}
                  {details?.genres && details.genres.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Genres</h3>
                      <div className="flex flex-wrap gap-2">
                        {details.genres.map((genre) => (
                          <button
                            type="button"
                            key={genre.id}
                            onClick={() => {
                              router.push(
                                `/search?${new URLSearchParams({
                                  type: currentType,
                                  genre: genre.id.toString(),
                                }).toString()}`
                              );
                              onClose();
                            }}
                            className="px-3 py-1 rounded-full bg-muted text-sm text-foreground no-close transition hover:bg-primary/10 cursor-pointer"
                          >
                            {genre.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos Carousel */}
                  {allVideos.length > 0 && (
                    <VideosCarousel
                      videos={allVideos}
                      onVideoSelect={(video) => {
                        setSelectedVideo(video);
                        setIsTrailerModalOpen(true);
                      }}
                    />
                  )}

                  {/* Where to Watch */}
                  {watchAvailability && (
                    <ContentDetailWhereToWatch watchAvailability={watchAvailability} />
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {posterPath && (
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                      <Image
                        src={getPosterUrl(posterPath, "w500")}
                        alt={title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  
                  {/* Details */}
                  <ContentDetailDetailsGrid type={type} details={details} />
                 
                </div>
              </div>

              {/* TV Seasons & Episodes - Full Width, Outside Grid */}
              {type === "tv" && seasonsData && (
                <div className="w-full mt-8">
                  <TVSeasonsSection
                    seasons={seasonsData.seasons}
                    selectedSeason={selectedSeason}
                    onSeasonSelect={setSelectedSeason}
                    seasonDetails={seasonDetails}
                    isLoadingSeasonDetails={isLoadingSeasonDetails}
                    tvShow={item as TMDBSeries}
                    onEpisodeClick={(episode: {
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
                      setSelectedEpisode(episode);
                      setIsEpisodeModalOpen(true);
                    }}
                  />
                </div>
              )}

              {/* More Like This Section - Full Width, Outside Grid */}
              <div className="w-full mt-8">
                <MoreLikeThis
                  items={moreLikeThisItems}
                  type={type}
                  title="More Like This"
                  isLoading={isLoadingMoreLikeThis}
                  parentItem={item}
                  parentType={type}
                  onItemClick={handleNavigate}
                />
              </div>
              </>
            )}
          </div>
        </div>
        )}

        {/* Trailer Modal */}
        {selectedVideo && (
          <TrailerModal
            video={selectedVideo}
            videos={allVideos}
            isOpen={isTrailerModalOpen}
            onClose={() => {
              setIsTrailerModalOpen(false);
              setSelectedVideo(null);
            }}
            title={title}
          />
        )}

      </SheetContent>
    </Sheet>

    {/* Episode Detail Modal */}
    {type === "tv" && item && selectedEpisode && (
      <EpisodeDetailModal
        isOpen={isEpisodeModalOpen}
        onClose={() => {
          setIsEpisodeModalOpen(false);
          setSelectedEpisode(null);
        }}
        episode={selectedEpisode}
        tvShow={item as TMDBSeries}
        tvShowDetails={tvDetails || null}
        trailer={trailer}
      />
    )}
    </>
  );
}
