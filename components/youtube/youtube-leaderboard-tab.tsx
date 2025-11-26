"use client";

import { useState } from "react";
import { useReviewLeaderboard } from "@/hooks/use-youtube-review-leaderboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy } from "lucide-react";

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

  const renderTableView = () => (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="text-right">Reviews</TableHead>
            <TableHead className="text-right">Helpful</TableHead>
            <TableHead className="text-right pr-8">Avg Rating</TableHead>
            <TableHead>Badges</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedLeaderboard.map((entry) => {
            const displayName = entry.user?.displayName || entry.user?.username || "Anonymous";
            const initials = displayName.slice(0, 2).toUpperCase();
            const rankIcon = getRankIcon(entry.rank);

            return (
              <TableRow key={entry.userId}>
                <TableCell>
                  {rankIcon ? (
                    <span className="text-xl">{rankIcon}</span>
                  ) : (
                    <span className="font-bold text-muted-foreground">#{entry.rank}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {entry.user?.avatarUrl ? (
                        <AvatarImage src={entry.user.avatarUrl} alt={displayName} />
                      ) : (
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      )}
                    </Avatar>
                    <span className="font-medium">{displayName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{entry.reviewCount}</TableCell>
                <TableCell className="text-right">{entry.helpfulVotes}</TableCell>
                <TableCell className="text-right pr-8">
                  {entry.averageRating ? entry.averageRating.toFixed(1) : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {entry.badges.slice(0, 3).map((badge) => (
                      <Badge
                        key={badge.slug}
                        variant="secondary"
                        className="text-xs"
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Top Reviewers</h2>
          <p className="text-sm text-muted-foreground">Recognizing our most active contributors</p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="mt-6">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Reviews</TableHead>
                  <TableHead className="text-right">Helpful</TableHead>
                  <TableHead className="text-right pr-8">Avg Rating</TableHead>
                  <TableHead>Badges</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 10 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-5 w-8" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-5 w-5 rounded" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : sortedLeaderboard.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center mt-6">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No reviewers yet.</p>
        </div>
      ) : (
        <div className="mt-6">
          {renderTableView()}
        </div>
      )}
    </div>
  );
}

