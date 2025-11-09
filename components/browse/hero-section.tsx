"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Info, Plus } from "lucide-react";
import { TMDBMovie, TMDBSeries, getBackdropUrl } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface HeroSectionProps {
  featuredItem: TMDBMovie | TMDBSeries | null;
  type: "movie" | "tv";
  isLoading?: boolean;
}

export default function HeroSection({ featuredItem, type, isLoading }: HeroSectionProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  if (isLoading || !featuredItem) {
    return (
      <div className="relative w-full h-[60vh] min-h-[500px] bg-muted">
        <Skeleton className="absolute inset-0 w-full h-full" />
      </div>
    );
  }

  // Type-safe title extraction
  const getTitle = (item: TMDBMovie | TMDBSeries): string => {
    if ("title" in item) {
      return item.title;
    }
    return item.name;
  };

  const title = getTitle(featuredItem);
  const overview = featuredItem.overview || "";
  const backdropPath = featuredItem.backdrop_path;

  return (
    <div className="relative w-full h-[60vh] min-h-[500px] overflow-hidden">
      {/* Backdrop Image */}
      {backdropPath && (
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
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-end">
        <div className="w-full px-4 sm:px-6 lg:px-8 pb-16">
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
                className="bg-white text-black hover:bg-white/90 h-12 px-8"
                asChild
              >
                <Link href={`/${type}/${featuredItem.id}`}>
                  <Play className="h-5 w-5 mr-2 fill-black" />
                  Play
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 text-white border-white/30 hover:bg-white/20 h-12 px-8 backdrop-blur-sm"
                asChild
              >
                <Link href={`/${type}/${featuredItem.id}`}>
                  <Info className="h-5 w-5 mr-2" />
                  More Info
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur-sm"
              >
                <Plus className="h-5 w-5 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

