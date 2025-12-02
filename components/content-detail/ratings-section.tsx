"use client";

import { Award, StarIcon, TrendingUp } from "lucide-react";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import { cn } from "@/lib/utils";

interface RatingsSectionProps {
  imdbRating: number | null;
  imdbVotes: number | null;
  metascore: number | null;
  rottenTomatoes: {
    critic?: number | null;
    audience?: number | null;
  } | null;
  tmdbRating: number | null;
}

export default function RatingsSection({
  imdbRating,
  imdbVotes,
  metascore,
  rottenTomatoes,
  tmdbRating,
}: RatingsSectionProps) {
  const hasAnyRating = imdbRating || metascore || rottenTomatoes?.critic || tmdbRating;

  if (!hasAnyRating) {
    return null;
  }

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

  const getMetascoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 60) return "text-green-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  const getRottenTomatoesColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 60) return "text-green-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Ratings</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* IMDb Rating */}
        {(imdbRating || tmdbRating) && (
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <IMDBBadge size={24} className="border-lg" />
              <span className="text-sm font-medium text-muted-foreground">IMDb</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {imdbRating ? imdbRating.toFixed(1) : tmdbRating?.toFixed(1) || "N/A"}
              </span>
              <span className="text-sm text-muted-foreground">/ 10</span>
            </div>
            {imdbVotes && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatVotes(imdbVotes)} votes
              </p>
            )}
          </div>
        )}

        {/* Metascore */}
        {metascore && (
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={cn("h-4 w-4", getMetascoreColor(metascore))} />
              <span className="text-sm font-medium text-muted-foreground">Metascore</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-2xl font-bold", getMetascoreColor(metascore))}>
                {metascore}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Critic reviews</p>
          </div>
        )}

        {/* Rotten Tomatoes */}
        {rottenTomatoes?.critic && (
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className={cn("h-4 w-4", getRottenTomatoesColor(rottenTomatoes.critic))} />
              <span className="text-sm font-medium text-muted-foreground">Rotten Tomatoes</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-2xl font-bold", getRottenTomatoesColor(rottenTomatoes.critic))}>
                {rottenTomatoes.critic}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tomatometer</p>
          </div>
        )}

        {/* TMDB Rating (if no IMDb) */}
        {!imdbRating && tmdbRating && (
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <StarIcon className="h-4 w-4 text-blue-400 fill-blue-400" />
              <span className="text-sm font-medium text-muted-foreground">TMDB</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {tmdbRating.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">/ 10</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">User rating</p>
          </div>
        )}
      </div>
    </div>
  );
}

