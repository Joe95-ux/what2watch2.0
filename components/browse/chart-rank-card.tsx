"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronUp, ChevronDown } from "lucide-react";
import { TMDBMovie, TMDBSeries, getPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

export type RankDelta = "up" | "down" | "same" | null;

interface ChartRankCardProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  position: number;
  delta: RankDelta;
  /** Numeric delta from JustWatch (for badge, same design as details page). */
  deltaNumber?: number | null;
}

export function ChartRankCard({ item, type, position, deltaNumber }: ChartRankCardProps) {
  const posterUrl = getPosterUrl(item.poster_path, "w342");
  const title = "title" in item ? item.title : item.name;
  const href = type === "movie" ? `/movie/${item.id}` : `/tv/${item.id}`;
  const delta = deltaNumber != null && deltaNumber !== 0 ? (deltaNumber > 0 ? "up" : "down") : null;

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex-shrink-0 w-[140px] sm:w-[160px] rounded-lg overflow-hidden block",
        "bg-muted aspect-[2/3] text-left",
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
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to left, rgba(0,0,0,0.75) 0%, transparent 50%)" }}
        />
      </div>

      {/* Position number - right side, ~2/3 visible */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2/3 flex items-center justify-end pr-2 pointer-events-none"
        aria-hidden
      >
        <span className="text-4xl sm:text-5xl font-bold text-white/90 drop-shadow-md tabular-nums">
          {position}
        </span>
      </div>

      {/* Rank delta indicator - top right, same design as movie details page hero */}
      {delta != null && deltaNumber != null && deltaNumber !== 0 && (
        <div className="absolute top-2 right-2 pointer-events-none">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium",
              delta === "up" ? "bg-green-600 text-white" : "bg-red-600 text-white"
            )}
          >
            {delta === "up" ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {Math.abs(deltaNumber)}
          </span>
        </div>
      )}
    </Link>
  );
}
