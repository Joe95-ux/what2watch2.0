"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronUp, ChevronDown } from "lucide-react";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { JustWatchRankWindow } from "@/lib/justwatch";

interface RatingsRowProps {
  imdbRating: number | null;
  imdbVotes: number | null;
  metascore: number | null;
  rottenTomatoes: {
    critic?: number | null;
    audience?: number | null;
  } | null;
  tmdbRating: number | null;
  /** JustWatch streaming chart rank (e.g. 7d rank). Shown first with small JW logo. */
  justwatchRank?: number | null;
  /** Link to JustWatch title/streaming chart page. */
  justwatchRankUrl?: string | null;
  /** When provided, enables 1d/7d/30d selector and delta; overrides justwatchRank. */
  justwatchRanks?: { "1d"?: JustWatchRankWindow; "7d"?: JustWatchRankWindow; "30d"?: JustWatchRankWindow } | null;
  /** Release year (movie or TV). */
  year?: number | null;
}

export function RatingsRow({
  imdbRating,
  imdbVotes,
  metascore,
  rottenTomatoes,
  tmdbRating,
  justwatchRank,
  justwatchRankUrl,
  justwatchRanks,
  year,
}: RatingsRowProps) {
  const [rankWindow, setRankWindow] = useState<"1d" | "7d" | "30d">("7d");
  const displayRating = imdbRating || tmdbRating;

  const formatVotes = (votes: number | null) => {
    if (!votes) return null;
    if (votes >= 1000000) {
      return `${(votes / 1000000).toFixed(1)}M`;
    }
    if (votes >= 1000) {
      return `${(votes / 1000).toFixed(1)}K`;
    }
    return votes.toString();
  };

  const primaryRankFromRanks = justwatchRanks?.[rankWindow] ?? justwatchRanks?.["7d"] ?? justwatchRanks?.["30d"] ?? justwatchRanks?.["1d"];
  const rankNum =
    primaryRankFromRanks != null && typeof primaryRankFromRanks.rank === "number" && Number.isFinite(primaryRankFromRanks.rank)
      ? primaryRankFromRanks.rank
      : null;
  const displayRank = justwatchRanks ? rankNum : justwatchRank;
  const deltaNum =
    primaryRankFromRanks != null && typeof primaryRankFromRanks.delta === "number" && Number.isFinite(primaryRankFromRanks.delta)
      ? primaryRankFromRanks.delta
      : undefined;
  const displayRankDelta = justwatchRanks ? deltaNum : undefined;

  const hasAny =
    displayRank != null ||
    year != null ||
    displayRating ||
    metascore ||
    rottenTomatoes?.critic;
  if (!hasAny) return null;

  const rankWindowLabels: Record<"1d" | "7d" | "30d", string> = { "1d": "24h", "7d": "7d", "30d": "30d" };
  const rankContent = (
    <span className="inline-flex items-center gap-1.5 font-medium text-sm">
      <Image
        src="/jw-icon.png"
        alt="JustWatch"
        width={20}
        height={20}
        className="object-contain opacity-90"
        unoptimized
      />
      <span className="text-[#F5C518]">#{displayRank}</span>
      {displayRankDelta != null && displayRankDelta !== 0 && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium",
            displayRankDelta > 0 ? "bg-green-600 text-white" : "bg-red-600 text-white"
          )}
        >
          {displayRankDelta > 0 ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {Math.abs(displayRankDelta)}
        </span>
      )}
    </span>
  );

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* JustWatch streaming chart rank */}
      {displayRank != null && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {justwatchRankUrl ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={justwatchRankUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-foreground hover:opacity-80 transition-opacity"
                >
                  {rankContent}
                </a>
              </TooltipTrigger>
              <TooltipContent>JustWatch streaming charts</TooltipContent>
            </Tooltip>
          ) : (
            rankContent
          )}
          {justwatchRanks && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              {(["1d", "7d", "30d"] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setRankWindow(w)}
                  className={cn(
                    "px-1.5 py-0.5 rounded cursor-pointer",
                    rankWindow === w ? "bg-muted font-medium text-foreground" : "hover:text-foreground"
                  )}
                >
                  {rankWindowLabels[w]}
                </button>
              ))}
            </span>
          )}
        </div>
      )}

      {/* IMDb Rating */}
      {displayRating && (
        <div className="flex items-center gap-1.5">
          <IMDBBadge size={24} />
          <span className="font-medium text-sm">
            {displayRating.toFixed(1)}
            {imdbVotes && (
              <span className="text-muted-foreground ml-1">
                ({formatVotes(imdbVotes)})
              </span>
            )}
          </span>
        </div>
      )}

      {/* Year */}
      {year != null && (
        <span className="text-sm text-muted-foreground">{year}</span>
      )}

      {/* Rotten Tomatoes */}
      {rottenTomatoes?.critic && (
        <div className="flex items-center gap-1.5">
          <Image
            src="/rotten-tomatoes-fresh.png"
            alt="Rotten Tomatoes"
            width={24}
            height={24}
            unoptimized
          />
          <span className="font-medium text-sm">
            {rottenTomatoes.critic}%
          </span>
        </div>
      )}

      {/* Metascore */}
      {metascore && (
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
              metascore >= 60
                ? "bg-green-500 text-white"
                : metascore >= 40
                  ? "bg-yellow-500 text-white"
                  : "bg-red-500 text-white"
            )}
          >
            {metascore}
          </div>
          <span className="text-xs text-muted-foreground">Metascore</span>
        </div>
      )}
    </div>
  );
}
