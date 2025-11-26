"use client";

import { useState } from "react";
import { useReviewLeaderboard } from "@/hooks/use-youtube-review-leaderboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Star, ThumbsUp, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "reviews", label: "Most Reviews" },
  { value: "helpful", label: "Most Helpful" },
  { value: "rating", label: "Highest Rating" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export function YouTubeLeaderboardTab() {
  const [sortBy, setSortBy] = useState<SortValue>("reviews");
  const { data: leaderboard = [], isLoading } = useReviewLeaderboard();

  // Sort leaderboard based on selected option
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    switch (sortBy) {
      case "reviews":
        return b.reviewCount - a.reviewCount;
      case "helpful":
        return b.helpfulVotes - a.helpfulVotes;
      case "rating":
        const ratingA = a.averageRating ?? 0;
        const ratingB = b.averageRating ?? 0;
        return ratingB - ratingA;
      default:
        return 0;
    }
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Top Reviewers</h2>
          <p className="text-sm text-muted-foreground">Recognizing our most active contributors</p>
        </div>
        <Select value={sortBy} onValueChange={(value: SortValue) => setSortBy(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Leaderboard */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : sortedLeaderboard.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No reviewers yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedLeaderboard.map((entry) => {
            const displayName = entry.user?.displayName || entry.user?.username || "Anonymous";
            const initials = displayName.slice(0, 2).toUpperCase();
            const rankIcon = getRankIcon(entry.rank);

            return (
              <div
                key={entry.userId}
                className={cn(
                  "flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50",
                  entry.rank <= 3 && "border-primary/50 bg-primary/5"
                )}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-12 flex-shrink-0">
                  {rankIcon ? (
                    <span className="text-2xl">{rankIcon}</span>
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">#{entry.rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <Avatar className="h-12 w-12">
                  {entry.user?.avatarUrl ? (
                    <AvatarImage src={entry.user.avatarUrl} alt={displayName} />
                  ) : (
                    <AvatarFallback>{initials}</AvatarFallback>
                  )}
                </Avatar>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{displayName}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {entry.reviewCount} reviews
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {entry.helpfulVotes} helpful
                    </span>
                    {entry.averageRating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                        {entry.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Badges */}
                {entry.badges.length > 0 && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {entry.badges.slice(0, 3).map((badge) => (
                      <Badge
                        key={badge.slug}
                        variant="secondary"
                        className="text-xs font-medium"
                        title={badge.name}
                      >
                        {badge.icon || "🏆"}
                      </Badge>
                    ))}
                    {entry.badges.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{entry.badges.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

