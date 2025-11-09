"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Info, Plus } from "lucide-react";
import { TMDBMovie, TMDBSeries, getBackdropUrl, TMDBVideo, getYouTubeEmbedUrl } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface HeroSectionProps {
  featuredItem: TMDBMovie | TMDBSeries | null;
  type: "movie" | "tv";
  isLoading?: boolean;
}

export default function HeroSection({ featuredItem, type, isLoading }: HeroSectionProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [trailer, setTrailer] = useState<TMDBVideo | null>(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);

  // Type-safe title extraction
  const getTitle = (item: TMDBMovie | TMDBSeries): string => {
    if ("title" in item) {
      return item.title;
    }
    return item.name;
  };

  // Fetch trailer on mount
  useEffect(() => {
    if (featuredItem && !isLoading) {
      setIsLoadingTrailer(true);
      fetch(`/api/${type}/${featuredItem.id}/videos`)
        .then((res) => res.json())
        .then((data) => {
          // Find first trailer (prefer official trailers)
          const officialTrailer = data.results?.find(
            (v: TMDBVideo) => v.type === "Trailer" && v.official && v.site === "YouTube"
          );
          const anyTrailer = data.results?.find(
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
  }, [featuredItem, type, isLoading]);

  if (isLoading || !featuredItem) {
    return (
      <div className="relative w-full h-[70vh] min-h-[600px] bg-muted">
        <Skeleton className="absolute inset-0 w-full h-full" />
      </div>
    );
  }

  const title = getTitle(featuredItem);
  const overview = featuredItem.overview || "";
  const backdropPath = featuredItem.backdrop_path;

  return (
    <div className="relative w-full h-[70vh] min-h-[600px] overflow-hidden">
      {/* Trailer Video (if available) */}
      {trailer && (
        <div className="absolute inset-0 z-0">
          <iframe
            src={getYouTubeEmbedUrl(trailer.key)}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
            style={{ pointerEvents: "none" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
        </div>
      )}

      {/* Backdrop Image (fallback or when no trailer) */}
      {(!trailer || isLoadingTrailer) && backdropPath && (
        <>
          <div className="absolute inset-0">
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
      <div className="relative z-20 h-full flex items-end">
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
                className="bg-white text-black hover:bg-white/90 h-14 px-10 text-base font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                asChild
              >
                <Link href={`/${type}/${featuredItem.id}`}>
                  <Play className="h-6 w-6 mr-2.5 fill-black" />
                  Play
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 text-white border-white/30 hover:bg-white/20 hover:border-white/50 h-14 px-10 text-base font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-105"
                asChild
              >
                <Link href={`/${type}/${featuredItem.id}`}>
                  <Info className="h-6 w-6 mr-2.5" />
                  More Info
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 hover:border-white/50 backdrop-blur-sm transition-all duration-300 hover:scale-110"
              >
                <Plus className="h-6 w-6 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
