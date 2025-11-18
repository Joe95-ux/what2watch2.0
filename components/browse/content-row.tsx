"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "./movie-card";
import ContentDetailModal from "./content-detail-modal";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";

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
  const [scrollProgress, setScrollProgress] = useState(0); // 0 = start, 1 = scrolled
  const [currentPadding, setCurrentPadding] = useState(16); // Default to px-4 (16px)
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);

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
    emblaApi.on("scroll", updateScrollProgress);
    emblaApi.on("reInit", updateScrollProgress);

    return () => {
      emblaApi.off("scroll", updateScrollProgress);
      emblaApi.off("reInit", updateScrollProgress);
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
    // Default to browse route based on provided type
    return type === "tv" ? "/browse/tv" : "/browse/movies";
  })();

  return (
    <>
    <div className="mb-12">
      {/* Title with padding - Only render if title is not empty */}
      {title && (
        <div className="px-4 sm:px-6 lg:px-8 mb-6 flex items-center justify-between">
          <Link 
            href={titleHref}
            className="group/title inline-flex items-center gap-2 transition-all duration-300"
          >
            <h2 className="text-2xl font-medium text-foreground group-hover/title:text-primary transition-colors">
              {title}
            </h2>
            <ChevronRight 
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
      )}
      
      {/* Carousel container - starts with padding, expands to full width on scroll */}
      <div className="relative group/carousel overflow-hidden">
        {/* Control buttons - matching Explore Curated Lists style */}
        <button
          type="button"
          className={cn(
            "absolute left-0 top-0 h-full w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10",
            !canScrollPrev && "opacity-0 pointer-events-none"
          )}
          aria-label="Scroll left"
          onClick={() => emblaApi?.scrollPrev()}
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
          onClick={() => emblaApi?.scrollNext()}
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
        {/* Carousel - starts with left padding, expands to full width on scroll */}
        <div 
          className="transition-all duration-300 ease-out"
          style={{
            paddingLeft: `${currentPadding * (1 - scrollProgress)}px`, // Match title padding at start, 0 when scrolled
            paddingRight: scrollProgress > 0 ? '0px' : `${currentPadding}px`, // Remove right padding when scrolled
          }}
        >
          <div ref={emblaRef} className="overflow-hidden w-full" style={{ touchAction: 'pan-x' }}>
            <div className="-ml-2 md:-ml-4 flex gap-3">
              {items.map((item) => (
                <div key={item.id} className="pl-2 md:pl-4 basis-[180px] sm:basis-[200px] flex-shrink-0">
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
            </div>
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

