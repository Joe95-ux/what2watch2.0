"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Play, Plus, Heart, Star, Clock, Volume2, VolumeX, ArrowLeft, BookOpen, CalendarIcon } from "lucide-react";
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
} from "@/hooks/use-content-details";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import VideosCarousel from "./videos-carousel";
import TrailerModal from "./trailer-modal";
import MoreLikeThis from "./more-like-this";
import { useAddRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useToggleFavorite } from "@/hooks/use-favorites";
import AddToPlaylistDropdown from "@/components/playlists/add-to-playlist-dropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import LogToDiaryDropdown from "./log-to-diary-dropdown";

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
  const isClosingRef = useRef(false);
  const [isSheetMounted, setIsSheetMounted] = useState(false);
  
  // Track recently viewed
  const addRecentlyViewed = useAddRecentlyViewed();
  const toggleFavorite = useToggleFavorite();

  // Consistent click handler to prevent propagation
  const handleButtonClick = useCallback((e: React.MouseEvent, callback: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  }, []);

  // Fetch details based on type
  const { data: movieDetails, isLoading: isLoadingMovie } = useMovieDetails(
    type === "movie" ? item.id : null
  );
  const { data: tvDetails, isLoading: isLoadingTV } = useTVDetails(
    type === "tv" ? item.id : null
  );
  const { data: videosData } = useContentVideos(type, item.id);
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
              className="absolute top-4 left-4 z-[100] h-14 w-14 rounded-full bg-black/80 hover:bg-black/95 flex items-center justify-center transition-all shadow-xl backdrop-blur-sm cursor-pointer hover:scale-105 no-close"
              aria-label="Back"
            >
              <ArrowLeft className="h-7 w-7 text-white" />
            </button>
          )}

          {/* Close Button - More Prominent */}
          <button
            onClick={(e) => handleButtonClick(e, onClose)}
            className="absolute top-4 right-4 z-[100] h-14 w-14 rounded-full bg-black/80 hover:bg-black/95 flex items-center justify-center transition-all shadow-xl backdrop-blur-sm cursor-pointer hover:scale-105 no-close"
            aria-label="Close"
          >
            <X className="h-7 w-7 text-white" />
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none dark:from-black/90 dark:via-black/60" />
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/80 to-transparent dark:from-black/90 dark:via-black/80" />
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
                    {item.vote_average > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                        <span className="text-white/90 font-semibold">
                          {item.vote_average.toFixed(1)}
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
                      className="bg-white dark:bg-white text-black dark:text-black hover:bg-white/90 dark:hover:bg-white/90 h-14 px-10 text-base font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg rounded-md no-close"
                      asChild
                    >
                      <Link 
                        href={`/${type}/${item.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="no-close"
                      >
                        <Play className="size-6 mr-2.5 fill-black dark:fill-black" />
                        Play
                      </Link>
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AddToPlaylistDropdown
                          item={item}
                          type={type}
                          trigger={
                            <Button
                              size="lg"
                              variant="outline"
                              className="bg-white/10 dark:bg-white/10 text-white dark:text-white border-white/30 dark:border-white/30 hover:bg-white/20 dark:hover:bg-white/20 hover:border-white/50 dark:hover:border-white/50 h-14 w-14 p-0 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105 cursor-pointer no-close"
                              onClick={(e) => handleButtonClick(e, () => {})}
                            >
                              <Plus className="size-6 text-white dark:text-white" />
                            </Button>
                          }
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add to Playlist</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="lg"
                          variant="outline"
                          className="bg-white/10 dark:bg-white/10 border-white/30 dark:border-white/30 hover:bg-white/20 dark:hover:bg-white/20 hover:border-white/50 dark:hover:border-white/50 h-14 w-14 p-0 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105 cursor-pointer no-close"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            await toggleFavorite.toggle(item, type);
                          }}
                        >
                          <Heart 
                            className={`size-6 ${
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
                          className="bg-white/10 dark:bg-white/10 border-white/30 dark:border-white/30 hover:bg-white/20 dark:hover:bg-white/20 hover:border-white/50 dark:hover:border-white/50 h-14 w-14 p-0 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105 cursor-pointer no-close"
                          onClick={(e) => handleButtonClick(e, () => {})}
                        >
                          <BookOpen className="size-6 text-white dark:text-white" />
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
                            className="bg-white/10 dark:bg-white/10 text-white dark:text-white border-white/30 dark:border-white/30 hover:bg-white/20 dark:hover:bg-white/20 hover:border-white/50 dark:hover:border-white/50 h-14 w-14 p-0 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105 ml-auto cursor-pointer no-close"
                            onClick={(e) => handleButtonClick(e, () => setIsMuted(!isMuted))}
                            aria-label={isMuted ? "Unmute" : "Mute"}
                          >
                            {isMuted ? (
                              <VolumeX className="size-6 text-white dark:text-white" />
                            ) : (
                              <Volume2 className="size-6 text-white dark:text-white" />
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
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/10 dark:bg-white/10 text-white dark:text-white border-white/30 dark:border-white/30 hover:bg-white/20 dark:hover:bg-white/20 hover:border-white/50 dark:hover:border-white/50 h-14 w-14 p-0 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105 cursor-pointer pointer-events-auto no-close"
                    onClick={(e) => handleButtonClick(e, () => setIsMuted(true))}
                    aria-label="Clear"
                  >
                    <X className="size-6 text-white dark:text-white" />
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
                          <span
                            key={genre.id}
                            className="px-3 py-1 rounded-full bg-muted text-sm text-foreground no-close"
                          >
                            {genre.name}
                          </span>
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

                  {/* Additional Details */}
                  {details && (
                    <div>
                      <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Details</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {type === "movie" && "release_date" in details && details.release_date && (
                          <div>
                            <span className="text-muted-foreground block mb-1">Release Date</span>
                            <p className="font-medium text-foreground">{formatDate(details.release_date)}</p>
                          </div>
                        )}
                        {type === "tv" && "first_air_date" in details && details.first_air_date && (
                          <div>
                            <span className="text-muted-foreground block mb-1">First Air Date</span>
                            <p className="font-medium text-foreground">{formatDate(details.first_air_date)}</p>
                          </div>
                        )}
                        {type === "movie" && "runtime" in details && details.runtime && (
                          <div>
                            <span className="text-muted-foreground block mb-1">Runtime</span>
                            <p className="font-medium text-foreground">{formatRuntime(details.runtime)}</p>
                          </div>
                        )}
                        {type === "tv" && "episode_run_time" in details && details.episode_run_time?.[0] && (
                          <div>
                            <span className="text-muted-foreground block mb-1">Episode Runtime</span>
                            <p className="font-medium text-foreground">{formatRuntime(details.episode_run_time[0])}</p>
                          </div>
                        )}
                        {details.production_countries && details.production_countries.length > 0 && (
                          <div>
                            <span className="text-muted-foreground block mb-1">Country</span>
                            <p className="font-medium text-foreground">
                              {details.production_countries.map((c) => c.name).join(", ")}
                            </p>
                          </div>
                        )}
                        {details.spoken_languages && details.spoken_languages.length > 0 && (
                          <div>
                            <span className="text-muted-foreground block mb-1">Language</span>
                            <p className="font-medium text-foreground">
                              {details.spoken_languages.map((l) => l.english_name).join(", ")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
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
                  {details && (
                    <div className="space-y-3 text-sm">
                      {type === "tv" && "number_of_seasons" in details && (
                        <div>
                          <span className="text-muted-foreground">Seasons</span>
                          <p className="font-medium">{details.number_of_seasons}</p>
                        </div>
                      )}
                      {type === "tv" && "number_of_episodes" in details && (
                        <div>
                          <span className="text-muted-foreground">Episodes</span>
                          <p className="font-medium">{details.number_of_episodes}</p>
                        </div>
                      )}
                      {details.production_companies && details.production_companies.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Production</span>
                          <p className="font-medium">
                            {details.production_companies
                              .slice(0, 3)
                              .map((c) => c.name)
                              .join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* TV Seasons & Episodes - Full Width, Outside Grid */}
              {type === "tv" && seasonsData && (
                <div className="w-full mt-8">
                  <TVSeasonsSection
                    tvId={item.id}
                    seasons={seasonsData.seasons}
                    selectedSeason={selectedSeason}
                    onSeasonSelect={setSelectedSeason}
                    seasonDetails={seasonDetails}
                    isLoadingSeasonDetails={isLoadingSeasonDetails}
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
  );
}

// TV Seasons & Episodes Section Component
interface TVSeasonsSectionProps {
  tvId: number;
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

function TVSeasonsSection({
  seasons,
  selectedSeason,
  onSeasonSelect,
  seasonDetails,
  isLoadingSeasonDetails = false,
}: TVSeasonsSectionProps) {
  // Filter out season 0 (specials)
  const regularSeasons = seasons.filter((s) => s.season_number > 0);

  // Handle season selection with propagation prevention
  const handleSeasonSelect = useCallback((e: React.MouseEvent, seasonNumber: number) => {
    e.preventDefault();
    e.stopPropagation();
    onSeasonSelect(seasonNumber);
  }, [onSeasonSelect]);

  // Handle episode row click with propagation prevention
  const handleEpisodeClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Add actual episode click logic here if needed
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Seasons & Episodes</h3>
      
      {/* Season Selector */}
      <div className="flex flex-wrap gap-2">
        {regularSeasons.map((season) => (
          <button
            key={season.id}
            onClick={(e) => handleSeasonSelect(e, season.season_number)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all no-close",
              selectedSeason === season.season_number
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {season.name || `Season ${season.season_number}`}
          </button>
        ))}
      </div>

      {/* Episodes Table */}
      {selectedSeason !== null && (
        <div className="mt-6">
          {isLoadingSeasonDetails ? (
            <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
              Loading episodes...
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
                      className="hover:bg-muted/20 transition-colors cursor-pointer group no-close"
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
    </div>
  );
}