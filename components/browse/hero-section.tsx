"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Play, Info, Plus, Volume2, VolumeX } from "lucide-react";
import { TMDBMovie, TMDBSeries, getBackdropUrl, getYouTubeEmbedUrl, TMDBVideo } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TrailerModal from "./trailer-modal";
import ContentDetailModal from "./content-detail-modal";
import { useContentVideos } from "@/hooks/use-content-details";
import AddToPlaylistDropdown from "@/components/playlists/add-to-playlist-dropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface HeroSectionProps {
  featuredItem: TMDBMovie | TMDBSeries | null;
  featuredItems?: (TMDBMovie | TMDBSeries)[]; // Array of items for carousel rotation
  isLoading?: boolean;
}

export default function HeroSection({ featuredItem, featuredItems, isLoading }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isRotationPaused, setIsRotationPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay compatibility

  // Determine which items to use (array or single item)
  const items = featuredItems || (featuredItem ? [featuredItem] : []);
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
    if (currentItem) {
      setImageLoaded(false);
      setIsMuted(true);
    }
  }, [currentItem]);

  // Auto-rotate to next item after video playback (approximately 30-60 seconds)
  // Pause rotation when trailer modal or details sheet is open
  useEffect(() => {
    if (!featuredItems || featuredItems.length <= 1 || isRotationPaused || isDetailModalOpen) return;
    
    const rotationInterval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
        setIsTransitioning(false);
      }, 500); // Transition duration
    }, 45000); // Rotate every 45 seconds (typical trailer length)

    return () => clearInterval(rotationInterval);
  }, [featuredItems, isRotationPaused, isDetailModalOpen]);

  if (isLoading || !currentItem) {
    return (
      <div className="relative w-full h-[70vh] min-h-[600px] bg-muted">
        <Skeleton className="absolute inset-0 w-full h-full" />
      </div>
    );
  }

  const title = getTitle(currentItem);
  const overview = currentItem.overview || "";
  const backdropPath = currentItem.backdrop_path;

  return (
    <div className="relative w-full h-[70vh] min-h-[600px] overflow-hidden dark:bg-background bg-black">
      {/* Trailer Video (if available) - Full width with autoplay */}
      {/* Stop video when details sheet is open */}
      {trailer && !isLoadingTrailer && !isDetailModalOpen && (
        <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          <iframe
            key={`${trailer.key}-${isMuted}`} // Force reload when trailer or mute state changes
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
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none dark:from-background dark:via-background/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent pointer-events-none dark:from-background" />
        </div>
      )}

      {/* Backdrop Image (fallback when no trailer) */}
      {!trailer && !isLoadingTrailer && backdropPath && (
        <>
          <div className={`absolute inset-0 transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            <Image
              src={getBackdropUrl(backdropPath, "w1280")}
              alt={title}
              fill
              className="object-cover"
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
      {isLoadingTrailer && backdropPath && (
        <>
          <div className={`absolute inset-0 transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            <Image
              src={getBackdropUrl(backdropPath, "w1280")}
              alt={title}
              fill
              className="object-cover"
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

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10 dark:from-background dark:via-background/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent z-10 dark:from-background" />

      {/* Content */}
      <div className={`relative z-20 h-full flex items-end transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        <div className="relative w-full px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white drop-shadow-lg">
              {title}
            </h1>
            {overview && (
              <p className="text-base md:text-lg text-white/90 mb-6 line-clamp-3 drop-shadow-md">
                {overview}
              </p>
            )}
            <div className="flex items-center gap-4">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90 h-14 px-10 text-base font-medium transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-white/20 cursor-pointer"
                onClick={() => {
                  if (trailer) {
                    setIsRotationPaused(true);
                    setIsTrailerModalOpen(true);
                  }
                }}
                disabled={!trailer}
              >
                <Play className="mr-2.5 fill-black size-6" />
                Play
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 text-white border-white/30 hover:bg-white/25 hover:border-white/60 h-14 px-10 text-base font-medium backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-white/10 cursor-pointer"
                onClick={() => setIsDetailModalOpen(true)}
              >
                <Info className="mr-2.5 size-6" />
                More Info
              </Button>
              {currentItem && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <AddToPlaylistDropdown
                        item={currentItem}
                        type={currentItemType}
                        trigger={
                          <Button
                            size="lg"
                            variant="ghost"
                            className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/25 border border-white/30 hover:border-white/60 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-white/10 cursor-pointer"
                          >
                            <Plus className="text-white size-6" />
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
              {/* Mute/Unmute Toggle - Only show when trailer is available, on extreme right */}
              {trailer && !isLoadingTrailer && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      variant="ghost"
                      className="absolute right-8 bottom-20 h-14 w-14 rounded-full bg-white/10 hover:bg-white/25 border border-white/30 hover:border-white/60 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-white/10 cursor-pointer ml-auto"
                      onClick={() => setIsMuted(!isMuted)}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <VolumeX className="text-white size-6" />
                      ) : (
                        <Volume2 className="text-white size-6" />
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
