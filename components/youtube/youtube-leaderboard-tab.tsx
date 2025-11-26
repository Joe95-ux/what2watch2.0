"use client";

import { useState, useMemo } from "react";
import { useReviewLeaderboard } from "@/hooks/use-youtube-review-leaderboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Trophy, Star, ThumbsUp, MessageSquare, Table2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "reviews", label: "Most Reviews" },
  { value: "helpful", label: "Most Helpful" },
  { value: "rating", label: "Highest Rating" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export function YouTubeLeaderboardTab() {
  const [sortBy, setSortBy] = useState<SortValue>("reviews");
  const [viewMode, setViewMode] = useState<"list" | "table" | "chart">("list");
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

  // Prepare chart data (top 10 for better visualization)
  const chartData = useMemo(() => {
    return sortedLeaderboard.slice(0, 10).map((entry) => {
      const displayName = entry.user?.displayName || entry.user?.username || "Anonymous";
      return {
        name: displayName.length > 15 ? displayName.slice(0, 15) + "..." : displayName,
        reviews: entry.reviewCount,
        helpful: entry.helpfulVotes,
        rating: entry.averageRating ?? 0,
      };
    });
  }, [sortedLeaderboard]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  const chartConfig = {
    reviews: {
      label: "Reviews",
      color: "hsl(221 83% 53%)",
    },
    helpful: {
      label: "Helpful Votes",
      color: "hsl(142 72% 45%)",
    },
    rating: {
      label: "Average Rating",
      color: "hsl(45 93% 47%)",
    },
  };

  const renderListView = () => (
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
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
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
  );

  const renderTableView = () => (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="text-right">Reviews</TableHead>
            <TableHead className="text-right">Helpful</TableHead>
            <TableHead className="text-right">Avg Rating</TableHead>
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
                <TableCell className="text-right">
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

  const renderChartView = () => {
    const dataKey = sortBy === "reviews" ? "reviews" : sortBy === "helpful" ? "helpful" : "rating";
    const color = chartConfig[dataKey as keyof typeof chartConfig].color;

    return (
      <div className="space-y-4">
        <ChartContainer config={chartConfig} className="h-[400px]">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
        <p className="text-sm text-muted-foreground text-center">
          Showing top 10 reviewers by {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label.toLowerCase()}
        </p>
      </div>
    );
  };

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

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as typeof viewMode)}>
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="table">
            <Table2 className="h-4 w-4 mr-2" />
            Table
          </TabsTrigger>
          <TabsTrigger value="chart">
            <BarChart3 className="h-4 w-4 mr-2" />
            Chart
          </TabsTrigger>
        </TabsList>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4 mt-6">
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : sortedLeaderboard.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center mt-6">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No reviewers yet.</p>
          </div>
        ) : (
          <TabsContent value="list" className="mt-6">
            {renderListView()}
          </TabsContent>
        )}

        {!isLoading && sortedLeaderboard.length > 0 && (
          <>
            <TabsContent value="table" className="mt-6">
              {renderTableView()}
            </TabsContent>
            <TabsContent value="chart" className="mt-6">
              {renderChartView()}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

