"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { ChartRankCard, type RankDelta } from "./chart-rank-card";
import ContentDetailModal from "./content-detail-modal";
import { cn } from "@/lib/utils";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";

export interface ChartEntry {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  position: number;
  delta: RankDelta;
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
  const [selectedItem, setSelectedItem] = useState<{
    item: TMDBMovie | TMDBSeries;
    type: "movie" | "tv";
  } | null>(null);

  useEffect(() => {
    if (!emblaApi) return;
    const update = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    emblaApi.on("select", update);
    emblaApi.on("reInit", update);
    return () => {
      emblaApi.off("select", update);
      emblaApi.off("reInit", update);
    };
  }, [emblaApi]);

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

  if (entries.length === 0) {
    return null;
  }

  return (
    <>
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
              "absolute left-0 top-0 bottom-0 w-10 z-10 flex items-center justify-center",
              "bg-gradient-to-r from-background/80 to-transparent opacity-0 group-hover/carousel:opacity-100 transition-opacity",
              !canScrollPrev && "pointer-events-none opacity-0"
            )}
            aria-label="Scroll left"
            onClick={() => emblaApi?.scrollPrev()}
          >
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </button>
          <button
            type="button"
            className={cn(
              "absolute right-0 top-0 bottom-0 w-10 z-10 flex items-center justify-center",
              "bg-gradient-to-l from-background/80 to-transparent opacity-0 group-hover/carousel:opacity-100 transition-opacity",
              !canScrollNext && "pointer-events-none opacity-0"
            )}
            aria-label="Scroll right"
            onClick={() => emblaApi?.scrollNext()}
          />
          <div ref={emblaRef} className="overflow-hidden" style={{ touchAction: "pan-x" }}>
            <div className="flex gap-3">
              {entries.map(({ item, type, position, delta }) => (
                <ChartRankCard
                  key={`${type}-${item.id}`}
                  item={item}
                  type={type}
                  position={position}
                  delta={delta}
                  onCardClick={(i, t) => setSelectedItem({ item: i, type: t })}
                />
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
