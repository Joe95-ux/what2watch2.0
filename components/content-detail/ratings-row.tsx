"use client";

import Image from "next/image";
import { IMDBBadge } from "@/components/ui/imdb-badge";
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
}

export function RatingsRow({
  imdbRating,
  imdbVotes,
  metascore,
  rottenTomatoes,
  tmdbRating,
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

  if (!displayRating && !metascore && !rottenTomatoes?.critic) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
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
          <div className={cn(
            "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
            metascore >= 60 ? "bg-green-500 text-white" :
            metascore >= 40 ? "bg-yellow-500 text-white" :
            "bg-red-500 text-white"
          )}>
            {metascore}
          </div>
          <span className="text-xs text-muted-foreground">Metascore</span>
        </div>
      )}
    </div>
  );
}

