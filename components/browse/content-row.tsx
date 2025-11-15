"use client";

import { useState, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, ChevronRight as CaretRight, Trash2 } from "lucide-react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "./movie-card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ContentRowProps {
  title: string;
  items: (TMDBMovie | TMDBSeries)[];
  type: "movie" | "tv";
  isLoading?: boolean;
  href?: string; // Optional href for the title link
  showClearButton?: boolean;
  onClear?: () => void;
  isClearing?: boolean;
}

export default function ContentRow({ title, items, type, isLoading, href, showClearButton, onClear, isClearing }: ContentRowProps) {
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
  const carouselRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0); // 0 = start, 1 = scrolled
  const [currentPadding, setCurrentPadding] = useState(16); // Default to px-4 (16px)

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  // Calculate padding based on viewport width
  useEffect(() => {
    const getCurrentPadding = () => {
      if (typeof window === 'undefined') return 16;
      if (window.innerWidth >= 1024) return 32; // lg:px-8 = 32px
      if (window.innerWidth >= 640) return 24;  // sm:px-6 = 24px
      return 16; // px-4 = 16px
    };

    const updatePadding = () => {
      setCurrentPadding(getCurrentPadding());
    };

    updatePadding();
    window.addEventListener('resize', updatePadding);
    return () => window.removeEventListener('resize', updatePadding);
  }, []);


  // Track scroll progress to adjust padding
  useEffect(() => {
    if (!emblaApi) return;

    const updateScrollProgress = () => {
      const progress = emblaApi.scrollProgress();
      setScrollProgress(progress);
    };

    updateScrollProgress();
    emblaApi.on('scroll', updateScrollProgress);
    emblaApi.on('reInit', updateScrollProgress);

    return () => {
      emblaApi.off('scroll', updateScrollProgress);
      emblaApi.off('reInit', updateScrollProgress);
    };
  }, [emblaApi]);

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
        <div className="relative">
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
    <div className="mb-12">
      {/* Title with padding */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6 flex items-center justify-between">
        <Link 
          href={titleHref}
          className="group/title inline-flex items-center gap-2 transition-all duration-300"
        >
          <h2 className="text-2xl font-medium text-foreground group-hover/title:text-primary transition-colors">
            {title}
          </h2>
          <CaretRight 
            className="h-5 w-5 text-muted-foreground opacity-0 -translate-x-2 group-hover/title:opacity-100 group-hover/title:translate-x-0 transition-all duration-300" 
          />
        </Link>
        {showClearButton && onClear && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={isClearing}
            className="text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isClearing ? "Clearing..." : "Clear"}
          </Button>
        )}
      </div>
      
      {/* Carousel container - starts with padding, expands to full width on scroll */}
      <div className="relative">
        {/* Left Control Button - Anchored to left edge of carousel */}
        {canScrollPrev && (
          <button
            onClick={scrollPrev}
            className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 z-40",
              "h-12 w-12 flex items-center justify-center",
              "bg-black/60 hover:bg-black/80 backdrop-blur-sm",
              "rounded-full cursor-pointer transition-all duration-200",
              "hidden md:flex"
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
        )}

        {/* Right Control Button - Anchored to right edge of carousel */}
        {canScrollNext && (
          <button
            onClick={scrollNext}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 z-40",
              "h-12 w-12 flex items-center justify-center",
              "bg-black/60 hover:bg-black/80 backdrop-blur-sm",
              "rounded-full cursor-pointer transition-all duration-200",
              "hidden md:flex"
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        )}

        {/* Carousel - starts with left padding, expands to full width on scroll */}
        <div 
          ref={carouselRef}
          className="overflow-visible transition-all duration-300 ease-out"
          style={{
            paddingLeft: `${currentPadding * (1 - scrollProgress)}px`, // Match title padding at start, 0 when scrolled
            paddingRight: scrollProgress > 0 ? '0px' : `${currentPadding}px`, // Remove right padding when scrolled
          }}
        >
          <div className="overflow-visible" ref={emblaRef}>
            <div className="flex gap-3">
              {items.map((item) => (
                <div key={item.id} className="relative flex-shrink-0 w-[180px] sm:w-[200px] overflow-visible">
                  <MovieCard 
                    item={item} 
                    type={"title" in item ? "movie" : "tv"}
                    canScrollPrev={canScrollPrev}
                    canScrollNext={canScrollNext}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

