"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { Play, Info, Plus, Volume2, VolumeX } from "lucide-react";
import { TMDBMovie, TMDBSeries, getBackdropUrl, getPosterUrl, getYouTubeEmbedUrl, TMDBVideo } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TrailerModal from "./trailer-modal";
import ContentDetailModal from "./content-detail-modal";
import { useContentVideos, useMovieDetails, useOMDBData, useTVDetails } from "@/hooks/use-content-details";
import AddToListDropdown from "@/components/content-detail/add-to-list-dropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HeroStylizedTitle } from "@/components/ui/hero-stylized-title";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeroSectionProps {
  featuredItem: TMDBMovie | TMDBSeries | null;
  featuredItems?: (TMDBMovie | TMDBSeries)[]; // Array of items for carousel rotation
  isLoading?: boolean;
}

export default function HeroSection({ featuredItem, featuredItems, isLoading }: HeroSectionProps) {
  const isMobile = useIsMobile();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isRotationPaused, setIsRotationPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay compatibility
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(false);
  const transitionInProgressRef = useRef(false);

  // Determine which items to use (array or single item)
  const items = useMemo(
    () => featuredItems || (featuredItem ? [featuredItem] : []),
    [featuredItems, featuredItem]
  );
  const currentItem = items[currentIndex] || featuredItem;

  // Type-safe title extraction
  const getTitle = (item: TMDBMovie | TMDBSeries): string => {
    if ("title" in item) {
      return item.title;
    }
    return item.name;
  };

  // Determine type for current item
  const currentItemType = currentItem && "title" in currentItem ? "movie" : "tv";

  const { data: movieDetails } = useMovieDetails(
    currentItemType === "movie" && currentItem ? currentItem.id : null
  );
  const { data: tvDetails } = useTVDetails(
    currentItemType === "tv" && currentItem ? currentItem.id : null
  );
  const details = currentItemType === "movie" ? movieDetails : tvDetails;
  const imdbId =
    details && "imdb_id" in details && typeof details.imdb_id === "string"
      ? details.imdb_id
      : null;
  const { data: omdbData } = useOMDBData(imdbId);

  // Use React Query hook for videos with caching
  const { data: videosData, isLoading: isLoadingTrailer } = useContentVideos(
    currentItemType,
    currentItem?.id || null
  );

  // Extract trailer and all videos from cached data
  const { trailer, allVideos } = useMemo(() => {
    if (!videosData?.results) {
      return { trailer: null, allVideos: [] };
    }

    const videos = videosData.results;
    // Find first trailer (prefer official trailers)
    const officialTrailer = videos.find(
      (v: TMDBVideo) => v.type === "Trailer" && v.official && v.site === "YouTube"
    );
    const anyTrailer = videos.find(
      (v: TMDBVideo) => v.type === "Trailer" && v.site === "YouTube"
    );

    return {
      trailer: officialTrailer || anyTrailer || null,
      allVideos: videos,
    };
  }, [videosData]);

  // Reset image loaded and muted state when current item changes
  useEffect(() => {
    if (!currentItem) return;
    setImageLoaded((prev) => (prev ? false : prev));
    setIsMuted((prev) => (prev ? prev : true));
  }, [currentItem?.id]);

  useEffect(() => {
    if (items.length === 0) {
      setCurrentIndex((prev) => (prev === 0 ? prev : 0));
      return;
    }
    if (currentIndex >= items.length) {
      setCurrentIndex(0);
    }
  }, [items.length, currentIndex]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Auto-rotate to next item after video playback (approximately 30-60 seconds)
  // Pause rotation when trailer modal or details sheet is open
  useEffect(() => {
    const clearRotationTimers = () => {
      if (rotationIntervalRef.current !== null) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
      if (transitionTimeoutRef.current !== null) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
      transitionInProgressRef.current = false;
      setIsTransitioning((prev) => (prev ? false : prev));
    };

    if (!featuredItems || featuredItems.length <= 1 || isRotationPaused || isDetailModalOpen || !isMuted) {
      clearRotationTimers();
      return;
    }

    const len = featuredItems.length;

    rotationIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      if (transitionInProgressRef.current) return;

      transitionInProgressRef.current = true;
      setIsTransitioning((prev) => (prev ? prev : true));

      transitionTimeoutRef.current = setTimeout(() => {
        transitionTimeoutRef.current = null;
        if (!mountedRef.current) {
          transitionInProgressRef.current = false;
          return;
        }

        setCurrentIndex((prev) => {
          const next = (prev + 1) % len;
          return next === prev ? prev : next;
        });
        setIsTransitioning((prev) => (prev ? false : prev));
        transitionInProgressRef.current = false;
      }, 500);
    }, 45000);

    return () => {
      clearRotationTimers();
    };
  }, [featuredItems, isRotationPaused, isDetailModalOpen, isMuted]);

  if (isLoading || !currentItem) {
    return (
      <div className="relative w-full h-[75vh] sm:h-[80vh] -mt-[65px] bg-muted">
        <Skeleton className="absolute inset-0 w-full h-full" />
      </div>
    );
  }

  const title = getTitle(currentItem);
  const overview = currentItem.overview || "";
  const backdropPath = currentItem.backdrop_path;
  const posterPath = currentItem.poster_path;
  const hasBackdrop = !!backdropPath;
  const runtimeMinutes: number | null =
    currentItemType === "movie"
      ? details && "runtime" in details && typeof details.runtime === "number" && details.runtime > 0
        ? details.runtime
        : null
      : details && "episode_run_time" in details && Array.isArray(details.episode_run_time)
        ? (() => {
            const valid = details.episode_run_time.filter(
              (n): n is number => typeof n === "number" && !Number.isNaN(n) && n > 0
            );
            if (valid.length === 0) return null;
            return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
          })()
        : null;
  const releaseYearSource =
    currentItemType === "movie" && "release_date" in currentItem
      ? currentItem.release_date
      : "first_air_date" in currentItem
        ? currentItem.first_air_date
        : "";
  const releaseYear = releaseYearSource ? new Date(releaseYearSource).getFullYear().toString() : "N/A";
  const rated = omdbData?.rated ?? null;
  const imdbRating = omdbData?.imdbRating ?? (currentItem.vote_average > 0 ? currentItem.vote_average : null);
  const formatRuntimeMinutes = (minutes: number | null): string | null => {
    if (minutes == null || Number.isNaN(minutes) || minutes <= 0) return null;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };
  const movieRuntimeLabel = formatRuntimeMinutes(runtimeMinutes) ?? "N/A";
  const tvRuntimeLabel = formatRuntimeMinutes(runtimeMinutes);

  return (
    <div className="relative w-full h-[75vh] sm:h-[80vh] -mt-[65px] overflow-hidden bg-background">
      {/* Trailer Video (if available) - Full width with autoplay */}
      {/* Stop video when details sheet is open */}
      {trailer && !isLoadingTrailer && !isDetailModalOpen && !isMobile && (
        <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          <iframe
            key={trailer.key}
            src={getYouTubeEmbedUrl(trailer.key, true, isMuted)}
            className="w-full h-full"
            allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ 
              pointerEvents: "none",
              width: "100%",
              height: "100%"
            }}
            title="Trailer"
          />
        </div>
      )}

      {/* Backdrop Image (fallback when no trailer) */}
      {(!trailer || isDetailModalOpen || isMobile) && !isLoadingTrailer && (backdropPath || posterPath) && (
        <>
          <div className={`absolute inset-0 transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            <Image
              src={hasBackdrop ? getBackdropUrl(backdropPath, "w1280") : getPosterUrl(posterPath, "w780")}
              alt={title}
              fill
              className="object-cover object-center"
              priority
              onLoad={() => setImageLoaded(true)}
              unoptimized
            />
          </div>
          {!imageLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
        </>
      )}

      {/* Loading state backdrop */}
      {isLoadingTrailer && (backdropPath || posterPath) && (
        <>
          <div className={`absolute inset-0 transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            <Image
              src={hasBackdrop ? getBackdropUrl(backdropPath, "w1280") : getPosterUrl(posterPath, "w780")}
              alt={title}
              fill
              className="object-cover object-center"
              priority
              onLoad={() => setImageLoaded(true)}
              unoptimized
            />
          </div>
          {!imageLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
        </>
      )}

      {/* Gradient Overlay - Additional overlays on hero section */}
      {isMuted && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent z-10" />
        </>
      )}

      {/* Content - Positioned at bottom of hero */}
      <div className={`relative z-20 h-full flex items-end transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        <div className="relative w-full px-4 sm:px-6 lg:px-8 pb-10 sm:pb-20">
          <div className="max-w-2xl">
            <HeroStylizedTitle title={title} className="mb-4" />
            {isMuted && (
              <div className="mb-4 flex flex-wrap items-center gap-2 text-base text-white/90">
                {currentItemType === "tv" ? (
                  tvRuntimeLabel && (
                    <>
                      <span>{tvRuntimeLabel}</span>
                      <span aria-hidden>•</span>
                    </>
                  )
                ) : (
                  <>
                    <span>{movieRuntimeLabel}</span>
                    <span aria-hidden>•</span>
                  </>
                )}
                <span>{releaseYear}</span>
                {rated && (
                  <>
                    <span>•</span>
                    <span>{rated}</span>
                  </>
                )}
                {imdbRating && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1.5">
                      <IMDBBadge size={20} />
                      <span>{imdbRating.toFixed(1)}</span>
                    </span>
                  </>
                )}
              </div>
            )}
            {isMuted && overview && (
              <p className="text-base md:text-lg text-white/90 mb-6 line-clamp-3 drop-shadow-md">
                {overview}
              </p>
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                <Button
                  size="lg"
                  className="bg-white dark:bg-white text-black dark:text-black hover:bg-white/90 dark:hover:bg-white/90 h-10 sm:h-14 px-4 sm:px-10 text-sm sm:text-base font-medium transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-white/20 dark:hover:shadow-white/20 cursor-pointer"
                  onClick={() => {
                    if (trailer) {
                      setIsRotationPaused(true);
                      setIsTrailerModalOpen(true);
                    }
                  }}
                  disabled={!trailer}
                >
                  <Play className="fill-black dark:fill-black size-4 sm:size-6" />
                  Play Trailer
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 text-white border-white/30 hover:bg-white/25 hover:border-white/60 h-10 sm:h-14 px-4 sm:px-10 text-sm sm:text-base font-medium backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-xl cursor-pointer dark:border-white/30"
                  onClick={() => setIsDetailModalOpen(true)}
                >
                  <Info className="size-4 sm:size-6" />
                  More Info
                </Button>
                {currentItem && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <AddToListDropdown
                          item={currentItem}
                          type={currentItemType}
                          trigger={
                            <Button
                              size="lg"
                              variant="ghost"
                              className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-white/10 hover:bg-white/25 border border-white/30 hover:border-white/60 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-xl cursor-pointer dark:border-white/30"
                            >
                              <Plus className="text-white size-4 sm:size-6" />
                            </Button>
                          }
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add to Playlist</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {/* Mute/Unmute Toggle - Only show when trailer is available */}
              {trailer && !isLoadingTrailer && !isMobile && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      variant="ghost"
                      className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-white/10 hover:bg-white/25 border border-white/30 hover:border-white/60 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-xl cursor-pointer absolute right-4 top-4 sm:right-8 sm:top-auto sm:bottom-20 dark:border-white/30"
                      onClick={() => setIsMuted(!isMuted)}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <VolumeX className="text-white size-4 sm:size-6" />
                      ) : (
                        <Volume2 className="text-white size-4 sm:size-6" />
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

      {/* Trailer Modal */}
      {trailer && (
        <TrailerModal
          video={trailer}
          videos={allVideos}
          isOpen={isTrailerModalOpen}
          onClose={() => {
            setIsTrailerModalOpen(false);
            setIsRotationPaused(false);
          }}
          title={title}
        />
      )}

      {/* Detail Modal */}
      <ContentDetailModal
        item={currentItem}
        type={currentItemType}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
}
