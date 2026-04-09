"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "./movie-card";
import ContentDetailModal from "./content-detail-modal";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { useIsMobile } from "@/hooks/use-mobile";

interface ContentRowProps {
  title: string;
  items: (TMDBMovie | TMDBSeries)[];
  type: "movie" | "tv";
  isLoading?: boolean;
  href?: string; // Optional href for the title link
  showClearButton?: boolean;
  onClear?: () => void;
  isClearing?: boolean;
  titleAction?: React.ReactNode; // Optional action element next to title (e.g., dropdown)
  titlePrefix?: React.ReactNode; // Optional element before title (e.g., logo for streaming service)
  viewAllHref?: string; // Optional href for "View All" button
  onLoadMore?: () => void; // Callback when user scrolls to the end
  isLoadingMore?: boolean; // Whether more items are being loaded
}

export default function ContentRow({ title, items, type, isLoading, href, showClearButton, onClear, isClearing, titleAction, titlePrefix, viewAllHref, onLoadMore, isLoadingMore }: ContentRowProps) {
  const isMobile = useIsMobile();
  const emblaOptions = useMemo(() => ({
    align: "start" as const,
    slidesToScroll: 5,
    breakpoints: {
      "(max-width: 767px)": { slidesToScroll: 2 },
      "(max-width: 1024px)": { slidesToScroll: 3 },
      "(max-width: 1280px)": { slidesToScroll: 4 },
    },
  }), []);
  const emblaPlugins = useMemo(
    () => (isMobile ? [] : [WheelGesturesPlugin()]),
    [isMobile]
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions, emblaPlugins);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [currentPadding, setCurrentPadding] = useState(16); // Default to px-4 (16px)
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
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
      const nextPadding = getCurrentPadding();
      setCurrentPadding((prev) => (prev === nextPadding ? prev : nextPadding));
    };

    updatePadding();
    window.addEventListener('resize', updatePadding);
    return () => window.removeEventListener('resize', updatePadding);
  }, []);


  // Track scroll progress to adjust padding
  useEffect(() => {
    if (!emblaApi) return;

    const updateScrollState = () => {
      const nextCanScrollPrev = emblaApi.canScrollPrev();
      const nextCanScrollNext = emblaApi.canScrollNext();
      setCanScrollPrev((prev) => (prev === nextCanScrollPrev ? prev : nextCanScrollPrev));
      setCanScrollNext((prev) => (prev === nextCanScrollNext ? prev : nextCanScrollNext));
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

  // Generate href if not provided: use viewAllHref when present so title link matches "View All"
  const titleHref = href ?? viewAllHref ?? (() => {
    // Generate routes based on title
    const titleLower = title.toLowerCase();
    if (titleLower.includes("popular movies")) return "/browse/movies/popular";
    if (titleLower.includes("latest movies") || titleLower.includes("now playing")) return "/browse/movies/latest";
    if (titleLower.includes("popular tv") || titleLower.includes("popular tv shows")) return "/browse/tv/popular";
    if (titleLower.includes("latest tv") || titleLower.includes("on the air")) return "/browse/tv/latest";
    if (titleLower.includes("we think you'll love")) return "/browse/personalized";
    // Default to browse route based on provided type
    return type === "tv" ? "/browse/tv" : "/browse/movies";
  })();

  return (
    <>
    <div className="mb-12">
      {/* Title with padding - Only render if title is not empty */}
      {title && (
        <div className="px-4 sm:px-6 lg:px-8 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href={titleHref}
              className="group/title inline-flex items-center gap-2 transition-all duration-300"
            >
              {titlePrefix}
              <h2 className="text-[1.4rem] md:text-2xl font-medium text-foreground group-hover/title:text-primary transition-colors">
                {title}
              </h2>
              <ChevronRight 
                className="h-5 w-5 text-muted-foreground opacity-0 -translate-x-2 group-hover/title:opacity-100 group-hover/title:translate-x-0 transition-all duration-300" 
              />
            </Link>
            {titleAction}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={scrollPrev}
                disabled={!canScrollPrev}
                className="h-8 w-8 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={scrollNext}
                disabled={!canScrollNext}
                className="h-8 w-8 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {viewAllHref && (
              <Link 
                href={viewAllHref} 
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                View All
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
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
        </div>
      )}
      
      {/* Carousel container - starts with padding, expands to full width on scroll */}
      <div 
        className="relative group/carousel overflow-hidden transition-all duration-300 ease-out"
        style={{
          paddingLeft: `${currentPadding}px`,
          paddingRight: `${currentPadding}px`,
        }}
      >
        {/* Control buttons - matching Explore Curated Lists style */}
        <button
          type="button"
          className={cn(
            "absolute left-0 top-0 h-full w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10",
            !canScrollPrev && "opacity-0 pointer-events-none"
          )}
          aria-label="Scroll left"
          onClick={scrollPrev}
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        <button
          type="button"
          className={cn(
            "absolute right-0 top-0 h-full w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10",
            !canScrollNext && "opacity-0 pointer-events-none"
          )}
          aria-label="Scroll right"
          onClick={scrollNext}
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
        <div ref={emblaRef} className="overflow-hidden w-full" style={{ touchAction: 'pan-x' }}>
          <div className="flex gap-3">
            {items.map((item) => (
              <div key={item.id} className="basis-[180px] sm:basis-[200px] flex-shrink-0">
                <div className="relative overflow-hidden">
                  <MovieCard 
                    item={item} 
                    type={"title" in item ? "movie" : "tv"}
                    canScrollPrev={canScrollPrev}
                    canScrollNext={canScrollNext}
                    onCardClick={(clickedItem, clickedType) =>
                      setSelectedItem({
                        item: clickedItem,
                        type: clickedType,
                      })
                    }
                  />
                </div>
              </div>
            ))}
            {/* Loading indicator for infinite loading */}
            {isLoadingMore && (
              <div className="basis-[180px] sm:basis-[200px] flex-shrink-0 flex items-center justify-center">
                <div className="w-full aspect-[2/3] bg-muted rounded-lg animate-pulse flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Loading...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    {selectedItem && (
      <ContentDetailModal
        item={selectedItem.item}
        type={selectedItem.type}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    )}
    </>
  );
}

