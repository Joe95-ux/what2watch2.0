"use client";

import { useState, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardRowProps {
  title: string;
  items: (TMDBMovie | TMDBSeries)[];
  type: "movie" | "tv";
  isLoading?: boolean;
  href?: string;
}

export default function DashboardRow({ title, items, type, isLoading, href }: DashboardRowProps) {
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
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);

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
    return null;
  }

  if (items.length === 0) {
    return null;
  }

  const titleHref = href || "#";

  return (
    <>
    <div className="mb-6 sm:mb-8 md:mb-12">
      {/* Title */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
        <Link 
          href={titleHref}
          className="group/title inline-flex items-center gap-2 transition-all duration-300"
        >
          <h2 className="text-2xl font-medium text-foreground group-hover/title:text-primary transition-colors">
            {title}
          </h2>
        </Link>
      </div>
      
      {/* Carousel container with overflow-hidden */}
      <div className="relative group/carousel overflow-hidden">
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

