"use client";

import { useState, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, ChevronRight as CaretRight } from "lucide-react";
import { Playlist } from "@/hooks/use-playlists";
import PlaylistCard from "./playlist-card";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PlaylistRowProps {
  title: string;
  playlists: Playlist[];
  isLoading?: boolean;
  href?: string;
}

export default function PlaylistRow({ title, playlists, isLoading, href }: PlaylistRowProps) {
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
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentPadding, setCurrentPadding] = useState(16);
  const [rowPosition, setRowPosition] = useState<{ top: number; height: number } | null>(null);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  // Calculate padding based on viewport width
  useEffect(() => {
    const getCurrentPadding = () => {
      if (typeof window === 'undefined') return 16;
      if (window.innerWidth >= 1024) return 32;
      if (window.innerWidth >= 640) return 24;
      return 16;
    };

    const updatePadding = () => {
      setCurrentPadding(getCurrentPadding());
    };

    updatePadding();
    window.addEventListener('resize', updatePadding);
    return () => window.removeEventListener('resize', updatePadding);
  }, []);

  // Update row position for gradient positioning
  useEffect(() => {
    if (!rowRef.current) return;

    const updatePosition = () => {
      const rect = rowRef.current?.getBoundingClientRect();
      if (rect) {
        setRowPosition({ top: rect.top, height: rect.height });
      }
    };

    updatePosition();

    const intersectionObserver = new IntersectionObserver(
      () => updatePosition(),
      { threshold: [0, 1] }
    );
    intersectionObserver.observe(rowRef.current);

    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(rowRef.current);
    window.addEventListener('resize', updatePosition);

    return () => {
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize', updatePosition);
    };
  }, []);

  // Track scroll progress
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
                <div key={i} className="flex-shrink-0 w-[180px] sm:w-[200px] aspect-[3/4] bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (playlists.length === 0) {
    return null;
  }

  const titleHref = href || "/playlists";

  return (
    <div className="mb-12">
      {/* Title with padding - only render if title is provided */}
      {title && (
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
        </div>
      )}
      
      {/* Carousel container */}
      <div ref={rowRef} className="relative group">
        {/* Left Gradient Fade */}
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

        {/* Right Gradient Fade */}
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

        {/* Left Arrow Button */}
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

        {/* Right Arrow Button */}
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

        {/* Carousel */}
        <div 
          ref={carouselRef}
          className="overflow-visible transition-all duration-300 ease-out"
          style={{
            paddingLeft: `${currentPadding * (1 - scrollProgress)}px`,
            paddingRight: scrollProgress > 0 ? '0px' : `${currentPadding}px`,
          }}
        >
          <div className="overflow-visible" ref={emblaRef}>
            <div className="flex gap-3">
              {playlists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

