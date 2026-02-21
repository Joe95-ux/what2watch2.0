"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { ChartRankCard, type RankDelta } from "./chart-rank-card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";

export interface ChartEntry {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  /** JustWatch chart rank when available; null when not on chart. Shown as-is (no forced 1,2,3). */
  position: number | null;
  delta: RankDelta;
  /** Numeric delta from JustWatch (for badge display, same as details page). */
  deltaNumber?: number | null;
}

interface StreamingChartRowProps {
  providerName: string;
  providerLogoUrl: string | null;
  providerId: number;
  entries: ChartEntry[];
  isLoading?: boolean;
  rowRef?: React.Ref<HTMLDivElement | null>;
}

export function StreamingChartRow({
  providerName,
  providerLogoUrl,
  providerId,
  entries,
  isLoading,
  rowRef,
}: StreamingChartRowProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      slidesToScroll: 4,
      breakpoints: {
        "(max-width: 640px)": { slidesToScroll: 2 },
        "(max-width: 1024px)": { slidesToScroll: 3 },
      },
    },
    [WheelGesturesPlugin()]
  );
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const update = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    emblaApi.on("select", update);
    emblaApi.on("reInit", update);
    emblaApi.on("scroll", update);
    update();
    return () => {
      emblaApi.off("select", update);
      emblaApi.off("reInit", update);
      emblaApi.off("scroll", update);
    };
  }, [emblaApi]);

  // Reinit carousel when entries change so scroll state and buttons are correct
  useEffect(() => {
    emblaApi?.reInit();
  }, [emblaApi, entries.length]);

  const viewAllHref = `/search?watchProvider=${providerId}`;

  if (isLoading) {
    return (
      <div ref={rowRef} className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          <div className="h-7 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[140px] sm:w-[160px] aspect-[2/3] bg-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Always render a div with ref, even when empty, so scroll-to works
  if (entries.length === 0) {
    return (
      <div ref={rowRef} className="mb-10 scroll-mt-28">
        <div className="flex items-center gap-3 mb-4">
          {providerLogoUrl ? (
            <img
              src={providerLogoUrl}
              alt=""
              className="h-8 w-8 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
          )}
          <h3 className="text-xl font-medium text-foreground truncate">{providerName}</h3>
        </div>
        <p className="text-sm text-muted-foreground">No chart data available</p>
      </div>
    );
  }

  return (
    <div ref={rowRef} className="mb-10 scroll-mt-28">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {providerLogoUrl ? (
              <img
                src={providerLogoUrl}
                alt=""
                className="h-8 w-8 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
            )}
            <h3 className="text-xl font-medium text-foreground truncate">{providerName}</h3>
          </div>
          <Link
            href={viewAllHref}
            className="flex-shrink-0 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            View all
          </Link>
        </div>

        <div className="relative group/carousel overflow-hidden">
          <button
            type="button"
            className={cn(
              "absolute left-0 top-0 h-full w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 hidden md:flex items-center justify-center z-10",
              "opacity-0 group-hover/carousel:opacity-100",
              canScrollPrev
                ? "hover:bg-black/80 cursor-pointer"
                : "group-hover/carousel:opacity-50 cursor-default pointer-events-none"
            )}
            aria-label="Scroll left"
            aria-disabled={!canScrollPrev}
            onClick={() => emblaApi?.scrollPrev()}
          >
            <ChevronLeft className="h-6 w-6 text-white shrink-0" />
          </button>
          <button
            type="button"
            className={cn(
              "absolute right-0 top-0 h-full w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 hidden md:flex items-center justify-center z-10",
              "opacity-0 group-hover/carousel:opacity-100",
              canScrollNext
                ? "hover:bg-black/80 cursor-pointer"
                : "group-hover/carousel:opacity-50 cursor-default pointer-events-none"
            )}
            aria-label="Scroll right"
            aria-disabled={!canScrollNext}
            onClick={() => emblaApi?.scrollNext()}
          >
            <ChevronRight className="h-6 w-6 text-white shrink-0" />
          </button>
          <div ref={emblaRef} className="overflow-hidden w-full min-w-0" style={{ touchAction: "pan-x" }}>
            <div className="flex gap-3 flex-nowrap">
              {entries.map(({ item, type, position, delta, deltaNumber }) => (
                <ChartRankCard
                  key={`${type}-${item.id}`}
                  item={item}
                  type={type}
                  position={position}
                  delta={delta}
                  deltaNumber={deltaNumber}
                />
              ))}
            </div>
          </div>
        </div>
    </div>
  );
}
