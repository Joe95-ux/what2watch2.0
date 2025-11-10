"use client";

import { useState, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, ChevronRight as CaretRight } from "lucide-react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "./movie-card";
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
  const rowRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0); // 0 = start, 1 = scrolled
  const [currentPadding, setCurrentPadding] = useState(16); // Default to px-4 (16px)
  const [rowPosition, setRowPosition] = useState<{ top: number; height: number } | null>(null);

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

  // Update row position for gradient positioning (only on resize/intersection, not scroll)
  useEffect(() => {
    if (!rowRef.current) return;

    const updatePosition = () => {
      const rect = rowRef.current?.getBoundingClientRect();
      if (rect) {
        setRowPosition({ top: rect.top, height: rect.height });
      }
    };

    // Initial position
    updatePosition();

    // Use IntersectionObserver to update when row enters/leaves viewport
    const intersectionObserver = new IntersectionObserver(
      () => {
        // Update position when intersection changes (row enters/leaves viewport)
        updatePosition();
      },
      { threshold: [0, 1] }
    );
    intersectionObserver.observe(rowRef.current);

    // Update on resize
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(rowRef.current);
    window.addEventListener('resize', updatePosition);

    return () => {
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize', updatePosition);
    };
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
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
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
      </div>
      
      {/* Carousel container - starts with padding, expands to full width on scroll */}
      <div ref={rowRef} className="relative group">
        {/* Left Gradient Fade - Fixed to viewport edge, only show if can scroll left */}
        {canScrollPrev && rowPosition && (
          <div
            className={cn(
              "fixed left-0 w-16 z-30 pointer-events-none transition-opacity duration-300",
              "bg-gradient-to-r from-[#EEEFE9] via-[#EEEFE9]/80 to-transparent dark:from-background dark:via-background/80",
              "opacity-100",
              "hidden md:block"
            )}
            style={{
              top: `${rowPosition.top}px`,
              height: `${rowPosition.height}px`,
            }}
          />
        )}

        {/* Right Gradient Fade - Fixed to viewport edge, only show if can scroll */}
        {canScrollNext && rowPosition && (
          <div
            className={cn(
              "fixed right-0 w-16 z-30 pointer-events-none transition-opacity duration-300",
              "bg-gradient-to-l from-[#EEEFE9] via-[#EEEFE9]/80 to-transparent dark:from-background dark:via-background/80",
              "opacity-100",
              "hidden md:block"
            )}
            style={{
              top: `${rowPosition.top}px`,
              height: `${rowPosition.height}px`,
            }}
          />
        )}

        {/* Left Arrow Button - Only show if can scroll */}
        {canScrollPrev && (
          <button
            onClick={scrollPrev}
            className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 z-40 h-full w-12 flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
              "hover:bg-black/10 rounded cursor-pointer",
              "hidden md:flex"
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-8 w-8 text-white drop-shadow-lg" />
          </button>
        )}

        {/* Right Arrow Button - Only show if can scroll */}
        {canScrollNext && (
          <button
            onClick={scrollNext}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 z-40 h-full w-12 flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
              "hover:bg-black/10 rounded cursor-pointer",
              "hidden md:flex"
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-8 w-8 text-white drop-shadow-lg" />
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
                    type={type}
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

