"use client";

import Image from "next/image";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
  year,
}: RatingsRowProps) {
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

  const hasAny =
    justwatchRank != null ||
    year != null ||
    displayRating ||
    metascore ||
    rottenTomatoes?.critic;
  if (!hasAny) return null;

  const rankContent = (
    <span className="inline-flex items-center gap-1.5 font-medium text-sm">
      <Image
        src="/jw-icon.png"
        alt="JustWatch"
        width={24}
        height={24}
        className="object-contain opacity-90"
        unoptimized
      />
      #{justwatchRank}
    </span>
  );

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* JustWatch streaming chart rank */}
      {justwatchRank != null && (
        <div className="flex items-center gap-1.5">
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
