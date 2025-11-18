"use client";

import { useMemo, useState, useEffect } from "react";
import { TrendingUp, Users, Share2, Trophy, UserCheck, BarChart3 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  usePlaylistAnalytics,
  type PlaylistAnalyticsTotals,
  type PlaylistAnalyticsSummary,
} from "@/hooks/use-playlist-analytics";
import {
  useListAnalytics,
  type ListAnalyticsTotals,
  type ListAnalyticsSummary,
} from "@/hooks/use-list-analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const dateRangeOptions = [
  { value: "all", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
];

const trendChartConfig = {
  visits: {
    label: "Visits",
    color: "hsl(221 83% 53%)",
  },
  shares: {
    label: "Shares",
    color: "hsl(142 72% 45%)",
  },
};

export default function MyStatsContent() {
  const [range, setRange] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch both playlist and list analytics
  const { 
    data: playlistData, 
    isLoading: isLoadingPlaylists, 
    isError: isErrorPlaylists, 
    error: playlistError 
  } = usePlaylistAnalytics({
    range: range ? parseInt(range, 10) : undefined,
  });

  const { 
    data: listData, 
    isLoading: isLoadingLists, 
    isError: isErrorLists, 
    error: listError 
  } = useListAnalytics({
    range: range ? parseInt(range, 10) : undefined,
  });

  const isLoading = isLoadingPlaylists || isLoadingLists;
  const isError = isErrorPlaylists || isErrorLists;
  const error = playlistError || listError;

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 md:py-8 lg:py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1">My Stats</h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl">
              Track how your playlists and lists are performing across shares, visits,
              and audience engagement.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select 
              value={range ?? "all"} 
              onValueChange={(value) => setRange(value === "all" ? undefined : value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="playlists">
              <Share2 className="h-4 w-4 mr-2" />
              Playlists
            </TabsTrigger>
            <TabsTrigger value="lists">
              <Trophy className="h-4 w-4 mr-2" />
              Lists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <OverviewTab 
              playlistData={playlistData}
              listData={listData}
              isLoading={isLoading}
              isError={isError}
              error={error}
            />
          </TabsContent>

          <TabsContent value="playlists" className="mt-0">
            <PlaylistsTab 
              data={playlistData}
              isLoading={isLoadingPlaylists}
              isError={isErrorPlaylists}
              error={playlistError}
            />
          </TabsContent>

          <TabsContent value="lists" className="mt-0">
            <ListsTab 
              data={listData}
              isLoading={isLoadingLists}
              isError={isErrorLists}
              error={listError}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Overview Tab - Combined stats from playlists and lists
function OverviewTab({ 
  playlistData, 
  listData, 
  isLoading, 
  isError, 
  error 
}: { 
  playlistData?: PlaylistAnalyticsSummary; 
  listData?: ListAnalyticsSummary; 
  isLoading: boolean; 
  isError: boolean; 
  error: Error | null;
}) {
  const combinedTotals = useMemo(() => {
    const playlistTotals = playlistData?.totals;
    const listTotals = listData?.totals;
    
    return {
      shares: (playlistTotals?.shares ?? 0) + (listTotals?.shares ?? 0),
      visits: (playlistTotals?.visits ?? 0) + (listTotals?.visits ?? 0),
      uniqueVisitors: Math.max(playlistTotals?.uniqueVisitors ?? 0, listTotals?.uniqueVisitors ?? 0), // Approximate
      totalEngagement: (playlistTotals?.totalEngagement ?? 0) + (listTotals?.totalEngagement ?? 0),
      topPlaylist: playlistTotals?.topPlaylist ?? null,
      topList: listTotals?.topList ?? null,
    };
  }, [playlistData, listData]);

  const isEmpty = !isLoading && combinedTotals.totalEngagement === 0;

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState message={error instanceof Error ? error.message : "Unable to load analytics"} />;
  }

  if (isEmpty) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-base font-medium mb-2">
            No engagement yet
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Share your playlists and lists to start collecting insights. As people visit and
            interact, you&apos;ll see metrics populate here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <CombinedStatsOverview totals={combinedTotals} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Playlists Summary</CardTitle>
            <CardDescription>Your playlist performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Visits</span>
                <span className="text-lg font-semibold">{playlistData?.totals?.visits?.toLocaleString() ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Shares</span>
                <span className="text-lg font-semibold">{playlistData?.totals?.shares?.toLocaleString() ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Unique Visitors</span>
                <span className="text-lg font-semibold">{playlistData?.totals?.uniqueVisitors?.toLocaleString() ?? 0}</span>
              </div>
              {playlistData?.totals?.topPlaylist && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Top Playlist</p>
                  <p className="text-sm font-medium">{playlistData.totals.topPlaylist.name}</p>
                  <p className="text-xs text-muted-foreground">{playlistData.totals.topPlaylist.visits} visits</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lists Summary</CardTitle>
            <CardDescription>Your list performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Visits</span>
                <span className="text-lg font-semibold">{listData?.totals?.visits?.toLocaleString() ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Shares</span>
                <span className="text-lg font-semibold">{listData?.totals?.shares?.toLocaleString() ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Unique Visitors</span>
                <span className="text-lg font-semibold">{listData?.totals?.uniqueVisitors?.toLocaleString() ?? 0}</span>
              </div>
              {listData?.totals?.topList && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Top List</p>
                  <p className="text-sm font-medium">{listData.totals.topList.name}</p>
                  <p className="text-xs text-muted-foreground">{listData.totals.topList.visits} visits</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Playlists Tab - Enhanced playlist stats
function PlaylistsTab({ 
  data, 
  isLoading, 
  isError, 
  error 
}: { 
  data?: PlaylistAnalyticsSummary; 
  isLoading: boolean; 
  isError: boolean; 
  error: Error | null;
}) {
  const trendData = useMemo(() => data?.trend ?? [], [data?.trend]);
  const leaderboard = useMemo(() => data?.leaderboard ?? [], [data?.leaderboard]);
  const sources = useMemo(() => data?.sources ?? [], [data?.sources]);
  const leaderboardBarData = useMemo(
    () =>
      leaderboard.map((entry) => {
        const shortName =
          entry.name.length > 22
            ? `${entry.name.slice(0, 19).trimEnd()}…`
            : entry.name;

        return {
          playlistId: entry.playlistId,
          name: entry.name,
          shortName,
          visits: entry.visits,
          shares: entry.shares,
        };
      }),
    [leaderboard]
  );

  const totals = data?.totals;
  const isEmpty = !isLoading && !!totals && totals.totalEngagement === 0;

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState message={error instanceof Error ? error.message : "Unable to load analytics"} />;
  }

  if (isEmpty) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-base font-medium mb-2">
            No playlist engagement yet
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Share your playlists to start collecting insights. As people visit and
            interact, you&apos;ll see metrics populate here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <StatsOverview totals={totals} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>Engagement Over Time</CardTitle>
            <CardDescription>
              Daily shares and visits across the selected range.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 sm:pl-4">
            {trendData.length ? (
              <ChartContainer
                config={trendChartConfig}
                className="h-[320px]"
              >
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip
                    cursor={{ strokeDasharray: "4 4" }}
                    content={<ChartTooltipContent />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="visits"
                    stroke="var(--color-visits)"
                    fill="var(--color-visits)"
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="shares"
                    stroke="var(--color-shares)"
                    fill="var(--color-shares)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                No trend data available for the selected range.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader className="pb-4">
            <CardTitle>Top Sources</CardTitle>
            <CardDescription>
              Where shares and visits originate most frequently.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sources.length ? (
              <div className="space-y-4">
                {sources.map((source) => (
                  <div
                    key={source.source}
                    className="flex items-center justify-between gap-4 rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {source.source.replace(/[_-]/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {source.source === "copy_link"
                          ? "Direct link shares"
                          : "Referral channel"}
                      </p>
                    </div>
                    <Badge variant="secondary">{source.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No source breakdown available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>Top Playlists Performance</CardTitle>
            <CardDescription>
              Shares and visits by playlist across the selected range.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 sm:pl-4">
            {leaderboardBarData.length ? (
              <ChartContainer
                config={trendChartConfig}
                className="h-[320px]"
              >
                <BarChart
                  data={leaderboardBarData}
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                  barCategoryGap={24}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="shortName"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    height={50}
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_label, payload) =>
                          payload?.[0]?.payload?.name ?? ""
                        }
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="visits"
                    fill="var(--color-visits)"
                    radius={[4, 4, 0, 0]}
                    stackId="engagement"
                    maxBarSize={48}
                  />
                  <Bar
                    dataKey="shares"
                    fill="var(--color-shares)"
                    radius={[4, 4, 0, 0]}
                    stackId="engagement"
                    maxBarSize={48}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                Not enough playlist data to visualize yet.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="xl:col-span-1">
          <PlaylistLeaderboard leaderboard={leaderboard} />
        </div>
      </div>
    </>
  );
}

// Lists Tab - List stats
function ListsTab({ 
  data, 
  isLoading, 
  isError, 
  error 
}: { 
  data?: ListAnalyticsSummary; 
  isLoading: boolean; 
  isError: boolean; 
  error: Error | null;
}) {
  const trendData = useMemo(() => data?.trend ?? [], [data?.trend]);
  const leaderboard = useMemo(() => data?.leaderboard ?? [], [data?.leaderboard]);
  const sources = useMemo(() => data?.sources ?? [], [data?.sources]);
  const leaderboardBarData = useMemo(
    () =>
      leaderboard.map((entry) => {
        const shortName =
          entry.name.length > 22
            ? `${entry.name.slice(0, 19).trimEnd()}…`
            : entry.name;

        return {
          listId: entry.listId,
          name: entry.name,
          shortName,
          visits: entry.visits,
          shares: entry.shares,
        };
      }),
    [leaderboard]
  );

  const totals = data?.totals;
  const isEmpty = !isLoading && !!totals && totals.totalEngagement === 0;

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState message={error instanceof Error ? error.message : "Unable to load analytics"} />;
  }

  if (isEmpty) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-base font-medium mb-2">
            No list engagement yet
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Share your lists to start collecting insights. As people visit and
            interact, you&apos;ll see metrics populate here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ListStatsOverview totals={totals} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>Engagement Over Time</CardTitle>
            <CardDescription>
              Daily shares and visits across the selected range.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 sm:pl-4">
            {trendData.length ? (
              <ChartContainer
                config={trendChartConfig}
                className="h-[320px]"
              >
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip
                    cursor={{ strokeDasharray: "4 4" }}
                    content={<ChartTooltipContent />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="visits"
                    stroke="var(--color-visits)"
                    fill="var(--color-visits)"
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="shares"
                    stroke="var(--color-shares)"
                    fill="var(--color-shares)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                No trend data available for the selected range.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader className="pb-4">
            <CardTitle>Top Sources</CardTitle>
            <CardDescription>
              Where shares and visits originate most frequently.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sources.length ? (
              <div className="space-y-4">
                {sources.map((source) => (
                  <div
                    key={source.source}
                    className="flex items-center justify-between gap-4 rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {source.source.replace(/[_-]/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {source.source === "copy_link"
                          ? "Direct link shares"
                          : "Referral channel"}
                      </p>
                    </div>
                    <Badge variant="secondary">{source.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No source breakdown available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>Top Lists Performance</CardTitle>
            <CardDescription>
              Shares and visits by list across the selected range.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 sm:pl-4">
            {leaderboardBarData.length ? (
              <ChartContainer
                config={trendChartConfig}
                className="h-[320px]"
              >
                <BarChart
                  data={leaderboardBarData}
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                  barCategoryGap={24}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="shortName"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    height={50}
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_label, payload) =>
                          payload?.[0]?.payload?.name ?? ""
                        }
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="visits"
                    fill="var(--color-visits)"
                    radius={[4, 4, 0, 0]}
                    stackId="engagement"
                    maxBarSize={48}
                  />
                  <Bar
                    dataKey="shares"
                    fill="var(--color-shares)"
                    radius={[4, 4, 0, 0]}
                    stackId="engagement"
                    maxBarSize={48}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                Not enough list data to visualize yet.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="xl:col-span-1">
          <ListLeaderboard leaderboard={leaderboard} />
        </div>
      </div>
    </>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="h-[360px]">
        <CardContent className="h-full">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="py-10 text-center">
        <p className="text-sm text-destructive font-medium">
          {message || "Something went wrong while loading your analytics."}
        </p>
      </CardContent>
    </Card>
  );
}


// Combined stats overview for Overview tab
function CombinedStatsOverview({ totals }: { totals: { shares: number; visits: number; uniqueVisitors: number; totalEngagement: number } }) {
  if (!totals) {
    return null;
  }

  const shareToVisitRate =
    totals.visits === 0 ? 0 : (totals.shares / totals.visits) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
      <MetricCard
        icon={<Users className="h-5 w-5 text-blue-500" />}
        label="Total Visits"
        value={totals.visits}
        helper="Traffic across all playlists and lists"
      />
      <MetricCard
        icon={<Share2 className="h-5 w-5 text-emerald-500" />}
        label="Shares Triggered"
        value={totals.shares}
        helper="Link copies & social shares"
      />
      <MetricCard
        icon={<UserCheck className="h-5 w-5 text-sky-500" />}
        label="Unique Visitors"
        value={totals.uniqueVisitors}
        helper="Distinct viewers in this period"
      />
      <MetricCard
        icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
        label="Share-to-Visit Rate"
        value={shareToVisitRate}
        format="percentage"
        helper="How often shares turn into visits"
      />
    </div>
  );
}

// List stats overview
function ListStatsOverview({ totals }: { totals?: ListAnalyticsTotals }) {
  if (!totals) {
    return null;
  }

  const shareToVisitRate =
    totals.visits === 0 ? 0 : (totals.shares / totals.visits) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
      <MetricCard
        icon={<Users className="h-5 w-5 text-blue-500" />}
        label="Total Visits"
        value={totals.visits}
        helper="Traffic across all lists"
      />
      <MetricCard
        icon={<Share2 className="h-5 w-5 text-emerald-500" />}
        label="Shares Triggered"
        value={totals.shares}
        helper="Link copies & social shares"
      />
      <MetricCard
        icon={<UserCheck className="h-5 w-5 text-sky-500" />}
        label="Unique Visitors"
        value={totals.uniqueVisitors}
        helper="Distinct viewers in this period"
      />
      <MetricCard
        icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
        label="Share-to-Visit Rate"
        value={shareToVisitRate}
        format="percentage"
        helper="How often shares turn into visits"
      />
      <MetricCard
        icon={<Trophy className="h-5 w-5 text-amber-500" />}
        label="Top List"
        value={totals.topList?.visits ?? 0}
        helper={totals.topList?.name ?? "No standout list yet"}
      />
    </div>
  );
}

function StatsOverview({ totals }: { totals?: PlaylistAnalyticsTotals }) {
  if (!totals) {
    return null;
  }

  const shareToVisitRate =
    totals.visits === 0 ? 0 : (totals.shares / totals.visits) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
      <MetricCard
        icon={<Users className="h-5 w-5 text-blue-500" />}
        label="Total Visits"
        value={totals.visits}
        helper="Traffic across all playlists"
      />
      <MetricCard
        icon={<Share2 className="h-5 w-5 text-emerald-500" />}
        label="Shares Triggered"
        value={totals.shares}
        helper="Link copies & social shares"
      />
      <MetricCard
        icon={<UserCheck className="h-5 w-5 text-sky-500" />}
        label="Unique Visitors"
        value={totals.uniqueVisitors}
        helper="Distinct viewers in this period"
      />
      <MetricCard
        icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
        label="Share-to-Visit Rate"
        value={shareToVisitRate}
        format="percentage"
        helper="How often shares turn into visits"
      />
      <MetricCard
        icon={<Trophy className="h-5 w-5 text-amber-500" />}
        label="Top Playlist"
        value={totals.topPlaylist?.visits ?? 0}
        helper={totals.topPlaylist?.name ?? "No standout playlist yet"}
      />
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  helper?: string;
  format?: "number" | "percentage";
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  format = "number",
}: MetricCardProps) {
  const formattedValue =
    format === "percentage"
      ? `${Number.isFinite(value) ? (value >= 10 ? value.toFixed(0) : value.toFixed(1)) : "0"}%`
      : Number.isFinite(value)
      ? value.toLocaleString()
      : "0";

  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">{icon}</div>
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="text-3xl font-bold tracking-tight">
          {formattedValue}
        </div>
        {helper ? (
          <p className="text-xs text-muted-foreground max-w-xs">{helper}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

type SortField = "name" | "visits" | "shares" | "total";
type SortDirection = "asc" | "desc";

function PlaylistLeaderboard({
  leaderboard,
}: {
  leaderboard: Array<{
    playlistId: string;
    name: string;
    shares: number;
    visits: number;
    total: number;
    updatedAt: Date | string | null;
  }>;
}) {
  const [sortField, setSortField] = useState<SortField>("total");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile vs desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1280); // xl breakpoint
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const itemsPerPage = isMobile ? 20 : 5;

  // Sort leaderboard
  const sortedLeaderboard = useMemo(() => {
    const sorted = [...leaderboard].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "visits":
          aValue = a.visits;
          bValue = b.visits;
          break;
        case "shares":
          aValue = a.shares;
          bValue = b.shares;
          break;
        case "total":
          aValue = a.total;
          bValue = b.total;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [leaderboard, sortField, sortDirection]);

  // Paginate
  const totalPages = Math.ceil(sortedLeaderboard.length / itemsPerPage);
  const paginatedLeaderboard = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedLeaderboard.slice(start, end);
  }, [sortedLeaderboard, currentPage, itemsPerPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-muted-foreground/50">↕</span>;
    }
    return (
      <span className="ml-1">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Top Playlists</CardTitle>
        <CardDescription>
          Combined share and visit counts for your best performing playlists.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-accent/50 select-none"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center">
                  Playlist
                  <SortIcon field="name" />
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-accent/50 select-none"
                onClick={() => handleSort("visits")}
              >
                <div className="flex items-center justify-end">
                  Visits
                  <SortIcon field="visits" />
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-accent/50 select-none"
                onClick={() => handleSort("shares")}
              >
                <div className="flex items-center justify-end">
                  Shares
                  <SortIcon field="shares" />
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-accent/50 select-none font-semibold"
                onClick={() => handleSort("total")}
              >
                <div className="flex items-center justify-end">
                  Total Engagement
                  <SortIcon field="total" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLeaderboard.length ? (
              paginatedLeaderboard.map((entry) => (
                <TableRow key={entry.playlistId}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{entry.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatUpdatedAt(entry.updatedAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.visits.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.shares.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {entry.total.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No playlist engagement recorded yet.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        {sortedLeaderboard.length > itemsPerPage && (
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, sortedLeaderboard.length)} of{" "}
              {sortedLeaderboard.length} playlists
            </div>
            <div className="flex items-center gap-2 w-full overflow-auto md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground flex-shrink-0">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ListLeaderboard({
  leaderboard,
}: {
  leaderboard: Array<{
    listId: string;
    name: string;
    shares: number;
    visits: number;
    total: number;
    updatedAt: Date | string | null;
  }>;
}) {
  const [sortField, setSortField] = useState<SortField>("total");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1280);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const itemsPerPage = isMobile ? 20 : 5;

  const sortedLeaderboard = useMemo(() => {
    const sorted = [...leaderboard].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "visits":
          aValue = a.visits;
          bValue = b.visits;
          break;
        case "shares":
          aValue = a.shares;
          bValue = b.shares;
          break;
        case "total":
          aValue = a.total;
          bValue = b.total;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [leaderboard, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedLeaderboard.length / itemsPerPage);
  const paginatedLeaderboard = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedLeaderboard.slice(start, end);
  }, [sortedLeaderboard, currentPage, itemsPerPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-muted-foreground/50">↕</span>;
    }
    return (
      <span className="ml-1">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Top Lists</CardTitle>
        <CardDescription>
          Combined share and visit counts for your best performing lists.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-accent/50 select-none"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center">
                  List
                  <SortIcon field="name" />
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-accent/50 select-none"
                onClick={() => handleSort("visits")}
              >
                <div className="flex items-center justify-end">
                  Visits
                  <SortIcon field="visits" />
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-accent/50 select-none"
                onClick={() => handleSort("shares")}
              >
                <div className="flex items-center justify-end">
                  Shares
                  <SortIcon field="shares" />
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-accent/50 select-none font-semibold"
                onClick={() => handleSort("total")}
              >
                <div className="flex items-center justify-end">
                  Total Engagement
                  <SortIcon field="total" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLeaderboard.length ? (
              paginatedLeaderboard.map((entry) => (
                <TableRow key={entry.listId}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{entry.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatUpdatedAt(entry.updatedAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.visits.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.shares.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {entry.total.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No list engagement recorded yet.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {sortedLeaderboard.length > itemsPerPage && (
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, sortedLeaderboard.length)} of{" "}
              {sortedLeaderboard.length} lists
            </div>
            <div className="flex items-center gap-2 w-full overflow-auto md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground flex-shrink-0">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatUpdatedAt(updatedAt: Date | string | null) {
  if (!updatedAt) return "No recent activity";
  const date = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  if (Number.isNaN(date.getTime())) return "No recent activity";
  return `Updated ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}


