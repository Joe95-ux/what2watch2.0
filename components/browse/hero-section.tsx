"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Play, Info, Plus } from "lucide-react";
import { TMDBMovie, TMDBSeries, getBackdropUrl, getYouTubeEmbedUrl, TMDBVideo } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TrailerModal from "./trailer-modal";
import ContentDetailModal from "./content-detail-modal";

interface HeroSectionProps {
  featuredItem: TMDBMovie | TMDBSeries | null;
  featuredItems?: (TMDBMovie | TMDBSeries)[]; // Array of items for carousel rotation
  type: "movie" | "tv";
  isLoading?: boolean;
}

export default function HeroSection({ featuredItem, featuredItems, type, isLoading }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [trailer, setTrailer] = useState<TMDBVideo | null>(null);
  const [allVideos, setAllVideos] = useState<TMDBVideo[]>([]);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  // Fetch trailer when current item changes
  useEffect(() => {
    if (currentItem && !isLoading) {
      setIsLoadingTrailer(true);
      setImageLoaded(false);
      const itemType = "title" in currentItem ? "movie" : "tv";
      fetch(`/api/${itemType}/${currentItem.id}/videos`)
        .then((res) => res.json())
        .then((data) => {
          const videos = data.results || [];
          setAllVideos(videos);
          // Find first trailer (prefer official trailers)
          const officialTrailer = videos.find(
            (v: TMDBVideo) => v.type === "Trailer" && v.official && v.site === "YouTube"
          );
          const anyTrailer = videos.find(
            (v: TMDBVideo) => v.type === "Trailer" && v.site === "YouTube"
          );
          setTrailer(officialTrailer || anyTrailer || null);
        })
        .catch((error) => {
          console.error("Error fetching hero trailer:", error);
        })
        .finally(() => {
          setIsLoadingTrailer(false);
        });
    }
  }, [currentItem, isLoading]);

  // Auto-rotate to next item after video playback (approximately 30-60 seconds)
  useEffect(() => {
    if (!featuredItems || featuredItems.length <= 1) return;
    
    const rotationInterval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
        setIsTransitioning(false);
      }, 500); // Transition duration
    }, 45000); // Rotate every 45 seconds (typical trailer length)

    return () => clearInterval(rotationInterval);
  }, [featuredItems]);

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
    <div className="relative w-full h-[70vh] min-h-[600px] overflow-hidden">
      {/* Trailer Video (if available) */}
      {trailer && !isLoadingTrailer && (
        <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          <iframe
            src={getYouTubeEmbedUrl(trailer.key)}
            className="w-full h-full"
            allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ pointerEvents: "none" }}
            title="Trailer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent pointer-events-none" />
        </div>
      )}

      {/* Backdrop Image (fallback or when no trailer) */}
      {(!trailer || isLoadingTrailer) && backdropPath && (
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
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent z-10" />

      {/* Content */}
      <div className={`relative z-20 h-full flex items-end transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        <div className="w-full px-4 sm:px-6 lg:px-8 pb-20">
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
                    setIsTrailerModalOpen(true);
                  }
                }}
                disabled={!trailer}
              >
                <Play className="h-7 w-7 mr-2.5 fill-black" />
                Play
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 text-white border-white/30 hover:bg-white/25 hover:border-white/60 h-14 px-10 text-base font-medium backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-white/10 cursor-pointer"
                onClick={() => setIsDetailModalOpen(true)}
              >
                <Info className="h-7 w-7 mr-2.5" />
                More Info
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/25 border border-white/30 hover:border-white/60 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-white/10 cursor-pointer"
              >
                <Plus className="h-7 w-7 text-white" />
              </Button>
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
          onClose={() => setIsTrailerModalOpen(false)}
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
