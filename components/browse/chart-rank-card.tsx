"use client";

import Image from "next/image";
import { ChevronUp, ChevronDown, Minus } from "lucide-react";
import { TMDBMovie, TMDBSeries, getPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

export type RankDelta = "up" | "down" | "same" | null;

interface ChartRankCardProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  position: number;
  delta: RankDelta;
  onCardClick?: (item: TMDBMovie | TMDBSeries, type: "movie" | "tv") => void;
}

export function ChartRankCard({ item, type, position, delta, onCardClick }: ChartRankCardProps) {
  const posterUrl = getPosterUrl(item.poster_path, "w342");
  const title = "title" in item ? item.title : item.name;

  return (
    <button
      type="button"
      onClick={() => onCardClick?.(item, type)}
      className={cn(
        "group relative flex-shrink-0 w-[140px] sm:w-[160px] rounded-lg overflow-hidden",
        "bg-muted aspect-[2/3] text-left cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      )}
    >
      {/* Poster */}
      <div className="absolute inset-0">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 140px, 160px"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-muted-foreground/20" />
        )}
        {/* Overlay gradient so position number is readable */}
        <div
          className="absolute inset-0 bg-gradient-to-l from-black/70 via-transparent to-transparent"
          style={{ background: "linear-gradient(to left, rgba(0,0,0,0.75) 0%, transparent 50%)" }}
        />
      </div>

      {/* Position number - right side, ~2/3 visible */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2/3 flex items-center justify-end pr-2"
        aria-hidden
      >
        <span className="text-4xl sm:text-5xl font-bold text-white/90 drop-shadow-md tabular-nums">
          {position}
        </span>
      </div>

      {/* Rank delta indicator - bottom left on card */}
      <div className="absolute bottom-2 left-2 flex items-center gap-0.5">
        {delta === "up" && (
          <span className="flex items-center text-emerald-500" title="Rank went up">
            <ChevronUp className="h-4 w-4" />
          </span>
        )}
        {delta === "down" && (
          <span className="flex items-center text-red-500" title="Rank went down">
            <ChevronDown className="h-4 w-4" />
          </span>
        )}
        {delta === "same" && (
          <span className="flex items-center text-muted-foreground" title="No change">
            <Minus className="h-4 w-4" />
          </span>
        )}
      </div>
    </button>
  );
}
