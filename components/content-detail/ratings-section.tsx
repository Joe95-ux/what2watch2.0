"use client";

import { Award, StarIcon, TrendingUp, Star } from "lucide-react";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import { cn } from "@/lib/utils";
import { resolveDisplayRating } from "@/lib/rating-quality";

interface RatingsSectionProps {
  imdbRating: number | null;
  imdbVotes: number | null;
  metascore: number | null;
  rottenTomatoes: {
    critic?: number | null;
    audience?: number | null;
  } | null;
  tmdbRating: number | null;
  tmdbVoteCount?: number | null;
}

export default function RatingsSection({
  imdbRating,
  imdbVotes,
  metascore,
  rottenTomatoes,
  tmdbRating,
  tmdbVoteCount,
}: RatingsSectionProps) {
  const resolvedRating = resolveDisplayRating({
    imdbRating,
    imdbVotes,
    tmdbRating,
    tmdbVoteCount,
  });
  const displayRating = resolvedRating?.rating ?? null;
  const displaySource = resolvedRating?.source ?? null;
  const hasAnyRating = displayRating || metascore || rottenTomatoes?.critic;

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
        {/* IMDb Rating - only show if we have actual IMDb rating */}
        {displayRating && displaySource === "imdb" && (
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <IMDBBadge size={24} />
              <span className="text-sm font-medium text-muted-foreground">IMDb</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {displayRating.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">/ 10</span>
            </div>
            {resolvedRating?.votes ? (
              <p className="text-xs text-muted-foreground mt-1">
                {formatVotes(resolvedRating.votes)} votes
              </p>
            ) : null}
          </div>
        )}
        {displayRating && displaySource === "tmdb" && (
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium text-muted-foreground">TMDB</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {displayRating.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">/ 10</span>
            </div>
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

      </div>
    </div>
  );
}

