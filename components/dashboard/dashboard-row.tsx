"use client";

import { useState, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "@/components/browse/movie-card";
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
    <div className="mb-12">
      {/* Title and Controls Row */}
      <div className="flex items-center justify-between mb-6">
        <Link 
          href={titleHref}
          className="group/title inline-flex items-center gap-2 transition-all duration-300"
        >
          <h2 className="text-2xl font-medium text-foreground group-hover/title:text-primary transition-colors">
            {title}
          </h2>
        </Link>
        
        {/* Carousel Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className="h-9 w-9 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={scrollNext}
            disabled={!canScrollNext}
            className="h-9 w-9 cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Carousel container with overflow-hidden */}
      <div className="relative overflow-hidden">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex gap-3">
            {items.map((item) => (
              <div key={item.id} className="relative flex-shrink-0 w-[180px] sm:w-[200px]">
                <MovieCard 
                  item={item} 
                  type={"title" in item ? "movie" : "tv"}
                  canScrollPrev={canScrollPrev}
                  canScrollNext={canScrollNext}
                  variant="dashboard"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

