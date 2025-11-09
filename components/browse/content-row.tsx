"use client";

import { useState, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, ChevronRight as CaretRight } from "lucide-react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "./movie-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ContentRowProps {
  title: string;
  items: (TMDBMovie | TMDBSeries)[];
  type: "movie" | "tv";
  isLoading?: boolean;
  href?: string; // Optional href for the title link
}

export default function ContentRow({ title, items, type, isLoading, href }: ContentRowProps) {
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
      <div className="mb-12 px-4 sm:px-6 lg:px-8">
        <div className="h-8 w-48 bg-muted rounded mb-6 animate-pulse" />
        <div className="relative" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
          <div className="overflow-x-hidden">
            <div className="flex gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[180px] sm:w-[200px] aspect-[2/3] bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  // Generate href if not provided
  const titleHref = href || (() => {
    // Generate routes based on title
    const titleLower = title.toLowerCase();
    if (titleLower.includes("popular movies")) return "/browse/movies/popular";
    if (titleLower.includes("latest movies") || titleLower.includes("now playing")) return "/browse/movies/latest";
    if (titleLower.includes("popular tv") || titleLower.includes("popular tv shows")) return "/browse/tv/popular";
    if (titleLower.includes("latest tv") || titleLower.includes("on the air")) return "/browse/tv/latest";
    if (titleLower.includes("we think you'll love")) return "/browse/personalized";
    // For genre titles, we'll need to pass genreId separately or extract from context
    return "#";
  })();

  return (
    <div className="mb-12 px-4 sm:px-6 lg:px-8">
      <Link 
        href={titleHref}
        className="group/title inline-flex items-center gap-2 mb-6 transition-all duration-300"
      >
        <h2 className="text-2xl font-medium text-foreground group-hover/title:text-primary transition-colors">
          {title}
        </h2>
        <CaretRight 
          className="h-5 w-5 text-muted-foreground opacity-0 -translate-x-2 group-hover/title:opacity-100 group-hover/title:translate-x-0 transition-all duration-300" 
        />
      </Link>
      <div className="relative group overflow-visible" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
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
            "hover:bg-black/10 rounded cursor-pointer",
            "hidden md:flex",
            !canScrollPrev && "opacity-0"
          )}
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-8 w-8 text-white drop-shadow-lg" />
        </button>

        {/* Right Arrow Button - Netflix Style */}
        <button
          onClick={scrollNext}
          disabled={!canScrollNext}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 z-20 h-full w-12 flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
            "hover:bg-black/10 rounded cursor-pointer",
            "hidden md:flex",
            !canScrollNext && "opacity-0"
          )}
          aria-label="Scroll right"
        >
          <ChevronRight className="h-8 w-8 text-white drop-shadow-lg" />
        </button>

        {/* Carousel - overflow-hidden for Embla, but allow cards to overflow vertically */}
        <div className="overflow-x-hidden overflow-y-visible" ref={emblaRef}>
          <div className="flex gap-3">
            {items.map((item) => (
              <div key={item.id} className="flex-shrink-0 w-[180px] sm:w-[200px] overflow-visible">
                <MovieCard item={item} type={type} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

