"use client";

import { useRef, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TMDBMovie, TMDBSeries, getPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import MovieCard from "./movie-card";
import { Skeleton } from "@/components/ui/skeleton";

interface MoreLikeThisProps {
  items: (TMDBMovie | TMDBSeries)[];
  type: "movie" | "tv";
  title?: string;
  isLoading?: boolean;
}

export default function MoreLikeThis({ items, type, title = "More Like This", isLoading }: MoreLikeThisProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 5,
    breakpoints: {
      "(min-width: 1024px)": { slidesToScroll: 6 },
      "(min-width: 768px)": { slidesToScroll: 5 },
      "(min-width: 640px)": { slidesToScroll: 4 },
    },
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;

    const updateScrollButtons = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };

    updateScrollButtons();
    emblaApi.on("select", updateScrollButtons);
    emblaApi.on("reInit", updateScrollButtons);

    return () => {
      emblaApi.off("select", updateScrollButtons);
      emblaApi.off("reInit", updateScrollButtons);
    };
  }, [emblaApi]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[200px] w-[140px] flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold px-4 sm:px-6 lg:px-8">{title}</h3>
      <div className="relative">
        {/* Carousel Container */}
        <div className="overflow-x-hidden overflow-y-visible" ref={emblaRef}>
          <div className="flex gap-4 px-4 sm:px-6 lg:px-8">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex-[0_0_auto] w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px]"
              >
                <MovieCard item={item} type={type} variant="more-like-this" />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        {canScrollPrev && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-40 h-12 w-12 rounded-full",
              "bg-black/70 hover:bg-black/90 text-white border-0",
              "shadow-lg hover:shadow-xl transition-all",
              "hidden md:flex"
            )}
            onClick={() => emblaApi?.scrollPrev()}
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}

        {canScrollNext && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-40 h-12 w-12 rounded-full",
              "bg-black/70 hover:bg-black/90 text-white border-0",
              "shadow-lg hover:shadow-xl transition-all",
              "hidden md:flex"
            )}
            onClick={() => emblaApi?.scrollNext()}
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}

        {/* Gradient Overlays */}
        {canScrollPrev && (
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background via-background/80 to-transparent pointer-events-none z-30 hidden md:block" />
        )}
        {canScrollNext && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none z-30 hidden md:block" />
        )}
      </div>
    </div>
  );
}

