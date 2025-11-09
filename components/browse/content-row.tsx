"use client";

import { useState, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "./movie-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContentRowProps {
  title: string;
  items: (TMDBMovie | TMDBSeries)[];
  type: "movie" | "tv";
  isLoading?: boolean;
}

export default function ContentRow({ title, items, type, isLoading }: ContentRowProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 5,
    breakpoints: {
      "(max-width: 640px)": { slidesToScroll: 2 },
      "(max-width: 1024px)": { slidesToScroll: 3 },
      "(max-width: 1280px)": { slidesToScroll: 4 },
    },
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  useEffect(() => {
    if (!emblaApi) return;

    const updateScrollState = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };

    updateScrollState();
    emblaApi.on("select", updateScrollState);
    emblaApi.on("reInit", updateScrollState);

    return () => {
      emblaApi.off("select", updateScrollState);
      emblaApi.off("reInit", updateScrollState);
    };
  }, [emblaApi]);

  if (isLoading) {
    return (
      <div className="mb-12">
        <div className="h-8 w-48 bg-muted rounded mb-6 animate-pulse" />
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[200px] aspect-[2/3] bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-6 px-4 sm:px-6 lg:px-8">{title}</h2>
      <div className="relative group">
        {/* Left Gradient Fade */}
        {canScrollPrev && (
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none transition-opacity duration-300",
              "bg-gradient-to-r from-background via-background/80 to-transparent",
              "opacity-100",
              "hidden md:block"
            )}
          />
        )}

        {/* Right Gradient Fade */}
        {canScrollNext && (
          <div
            className={cn(
              "absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none transition-opacity duration-300",
              "bg-gradient-to-l from-background via-background/80 to-transparent",
              "opacity-100",
              "hidden md:block"
            )}
          />
        )}

        {/* Left Arrow Button - Netflix Style */}
        <button
          onClick={scrollPrev}
          disabled={!canScrollPrev}
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 z-20 h-full w-12 flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
            "hover:bg-black/20 rounded",
            "hidden md:flex",
            !canScrollPrev && "opacity-0 cursor-not-allowed"
          )}
          aria-label="Scroll left"
        >
          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-colors">
            <ChevronLeft className="h-6 w-6 text-white" />
          </div>
        </button>

        {/* Right Arrow Button - Netflix Style */}
        <button
          onClick={scrollNext}
          disabled={!canScrollNext}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 z-20 h-full w-12 flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
            "hover:bg-black/20 rounded",
            "hidden md:flex",
            !canScrollNext && "opacity-0 cursor-not-allowed"
          )}
          aria-label="Scroll right"
        >
          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-colors">
            <ChevronRight className="h-6 w-6 text-white" />
          </div>
        </button>

        {/* Carousel */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-3 px-4 sm:px-6 lg:px-8">
            {items.map((item) => (
              <div key={item.id} className="flex-shrink-0 w-[180px] sm:w-[200px]">
                <MovieCard item={item} type={type} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

