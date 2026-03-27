"use client";

import Image from "next/image";
import { Film, Tv } from "lucide-react";
import { getPosterUrl } from "@/lib/tmdb";
import {
  useMovieDetails,
  useOMDBData,
  useTVDetails,
  useWatchProviders,
} from "@/hooks/use-content-details";

interface SimpleMediaListItemProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  yearLabel?: string;
  addedLabel?: string;
  onClick?: () => void;
}

export function SimpleMediaListItem({
  tmdbId,
  mediaType,
  title,
  posterPath,
  yearLabel,
  addedLabel,
  onClick,
}: SimpleMediaListItemProps) {
  const { data: movieDetails } = useMovieDetails(mediaType === "movie" ? tmdbId : null);
  const { data: tvDetails } = useTVDetails(mediaType === "tv" ? tmdbId : null);
  const imdbId = mediaType === "movie" ? movieDetails?.imdb_id : tvDetails?.imdb_id;
  const { data: omdbData } = useOMDBData(imdbId || null);
  const { data: watchAvailability } = useWatchProviders(mediaType, tmdbId, "US");

  const justWatchRank =
    watchAvailability?.ranks?.["7d"]?.rank ??
    watchAvailability?.ranks?.["30d"]?.rank ??
    watchAvailability?.ranks?.["1d"]?.rank ??
    null;
  const rotten = omdbData?.rottenTomatoes?.critic ?? null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left cursor-pointer py-3 px-3 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        {posterPath ? (
          <div className="relative w-16 h-24 overflow-hidden flex-shrink-0 bg-muted">
            <Image src={getPosterUrl(posterPath)} alt={title} fill className="object-cover" sizes="64px" />
          </div>
        ) : (
          <div className="w-16 h-24 bg-muted flex-shrink-0 flex items-center justify-center">
            {mediaType === "movie" ? (
              <Film className="h-6 w-6 text-muted-foreground" />
            ) : (
              <Tv className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold leading-tight truncate">{title}</p>
          <p className="text-sm text-muted-foreground capitalize">
            {mediaType}
            {yearLabel ? ` • ${yearLabel}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">{addedLabel ? `Added ${addedLabel}` : "Added -"}</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              JW Rank:{" "}
              <span className="text-foreground font-medium">
                {justWatchRank != null ? `#${justWatchRank}` : "-"}
              </span>
            </span>
            <span className="text-muted-foreground">
              Rotten:{" "}
              <span className="text-foreground font-medium">{rotten != null ? `${rotten}%` : "-"}</span>
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

