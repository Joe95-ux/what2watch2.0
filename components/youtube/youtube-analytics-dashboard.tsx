"use client";

import { useState, useMemo, useEffect } from "react";
import { BarChart3, Eye, Clock, Heart, Bookmark, List, TrendingUp, Play } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useYouTubeAnalytics } from "@/hooks/use-youtube-analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO, eachDayOfInterval, startOfDay } from "date-fns";

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

const chartConfig = {
  views: {
    label: "Views",
    color: "hsl(221 83% 53%)",
  },
  watchTime: {
    label: "Watch Time (hours)",
    color: "hsl(142 72% 45%)",
  },
  engagement: {
    label: "Engagement",
    color: "hsl(45 93% 47%)",
  },
};

export function YouTubeAnalyticsDashboard() {
  const [period, setPeriod] = useState("30");
  const [topContentTab, setTopContentTab] = useState<"videos" | "channels">("videos");
  const [peakWatchingTab, setPeakWatchingTab] = useState<"hours" | "days">("hours");
  const { data, isLoading } = useYouTubeAnalytics(parseInt(period, 10));

  useEffect(() => {
    if (!data) return;
    if (data.stats?.totalViews === 0) {
      console.info("[YouTubeAnalytics] No view data yet", {
        period,
        hasMessage: Boolean(data.message),
      });
    }
  }, [data, period]);

  // Process views over time data
  const viewsOverTimeData = useMemo(() => {
    if (!data?.viewsOverTime || data.viewsOverTime.length === 0) return [];

    const periodDays = parseInt(period, 10);
    const startDate = startOfDay(new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000));
    const endDate = startOfDay(new Date());
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Create a map of dates to view counts
    const viewsMap = new Map<string, number>();
    data.viewsOverTime.forEach((item) => {
      // Handle both Date objects and ISO strings
      const date = item.createdAt instanceof Date 
        ? item.createdAt 
        : typeof item.createdAt === 'string' 
        ? parseISO(item.createdAt) 
        : new Date(item.createdAt);
      const dateKey = format(startOfDay(date), "yyyy-MM-dd");
      const currentCount = viewsMap.get(dateKey) || 0;
      viewsMap.set(dateKey, currentCount + item._count.id);
    });

    // Fill in all days with view counts
    return allDays.map((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      return {
        date: format(day, "MMM d"),
        views: viewsMap.get(dateKey) || 0,
      };
    });
  }, [data?.viewsOverTime, period]);

  // Engagement data for pie chart
  const engagementData = useMemo(() => {
    if (!data?.stats) return [];
    const stats = data.stats;
    return [
      { name: "Liked", value: stats.engagement.liked, color: "hsl(0 72% 51%)" },
      { name: "Watchlist", value: stats.engagement.addedToWatchlist, color: "hsl(221 83% 53%)" },
      { name: "Playlists", value: stats.engagement.addedToPlaylist, color: "hsl(142 72% 45%)" },
    ].filter((item) => item.value > 0);
  }, [data?.stats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalViews: 0,
    completedViews: 0,
    completionRate: 0,
    totalWatchTime: 0,
    averageWatchTime: 0,
    engagement: {
      liked: 0,
      addedToWatchlist: 0,
      addedToPlaylist: 0,
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Track your YouTube viewing habits and engagement
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data?.message && (
        <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-4 text-sm text-muted-foreground">
          {data.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedViews} completed ({stats.completionRate.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Watch Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(stats.totalWatchTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatDuration(stats.averageWatchTime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Liked Videos</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.engagement.liked}</div>
            <p className="text-xs text-muted-foreground">Videos you liked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved</CardTitle>
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.engagement.addedToWatchlist + stats.engagement.addedToPlaylist}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.engagement.addedToWatchlist} watchlist, {stats.engagement.addedToPlaylist} playlists
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Views Over Time Chart - Full Width */}
      {viewsOverTimeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Views Over Time
            </CardTitle>
            <CardDescription>Daily view count for the selected period</CardDescription>
          </CardHeader>
          <CardContent className="pl-2 sm:pl-4">
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <AreaChart data={viewsOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={30}
                  className="text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                />
                <ChartTooltip
                  cursor={{ strokeDasharray: "4 4" }}
                  content={<ChartTooltipContent />}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="var(--color-views)"
                  fill="var(--color-views)"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Engagement Breakdown and Top Content - Same row on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Engagement Breakdown */}
        {engagementData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Engagement Breakdown
              </CardTitle>
              <CardDescription>How you interact with videos</CardDescription>
            </CardHeader>
            <CardContent className="pl-2 sm:pl-4">
              <ChartContainer config={chartConfig} className="h-[320px] w-full">
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="value"
                    fill="var(--color-engagement)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Videos and Channels - Combined with Tabs */}
        {data && (data.topVideos.length > 0 || data.topChannels.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Content
              </CardTitle>
              <CardDescription>Most viewed videos and channels</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={topContentTab} onValueChange={(v) => setTopContentTab(v as "videos" | "channels")}>
                <TabsList className="mb-4">
                  <TabsTrigger value="videos">Top Videos</TabsTrigger>
                  <TabsTrigger value="channels">Top Channels</TabsTrigger>
                </TabsList>
                <TabsContent value="videos" className="mt-0">
                  {data.topVideos.length > 0 ? (
                    <div className="space-y-3">
                      {data.topVideos.slice(0, 10).map((video, index) => (
                        <div
                          key={video.videoId}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {video.videoTitle || `Video ${video.videoId.slice(0, 12)}...`}
                              </p>
                              <p className="text-xs text-muted-foreground">{video.viewCount} view{video.viewCount !== 1 ? "s" : ""}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No videos found</p>
                  )}
                </TabsContent>
                <TabsContent value="channels" className="mt-0">
                  {data.topChannels.length > 0 ? (
                    <div className="space-y-3">
                      {data.topChannels.slice(0, 10).map((channel, index) => (
                        <div
                          key={channel.channelId}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {channel.channelTitle || `Channel ${channel.channelId.slice(0, 12)}...`}
                              </p>
                              <p className="text-xs text-muted-foreground">{channel.viewCount} view{channel.viewCount !== 1 ? "s" : ""}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No channels found</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Peak Watching Times - Combined with Tabs */}
      {data?.peakWatchingTimes && data.stats.totalViews > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Peak Watching Times
            </CardTitle>
            <CardDescription>When you watch videos most</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={peakWatchingTab} onValueChange={(v) => setPeakWatchingTab(v as "hours" | "days")}>
              <TabsList className="mb-4">
                <TabsTrigger value="hours">By Hour</TabsTrigger>
                <TabsTrigger value="days">By Day</TabsTrigger>
              </TabsList>
              <TabsContent value="hours" className="mt-0">
                <ChartContainer config={chartConfig} className="h-[320px] w-full">
                  <BarChart data={data.peakWatchingTimes.byHour}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="hour"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `${value}:00`}
                      className="text-xs"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-xs"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="views"
                      fill="var(--color-views)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </TabsContent>
              <TabsContent value="days" className="mt-0">
                <ChartContainer config={chartConfig} className="h-[320px] w-full">
                  <BarChart data={data.peakWatchingTimes.byDayOfWeek}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="dayName"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-xs"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-xs"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="views"
                      fill="var(--color-views)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      {data && data.categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Category Breakdown
            </CardTitle>
            <CardDescription>Content categories you watch most</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.categoryBreakdown.slice(0, 10).map((category) => (
                <div key={category.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{category.category}</span>
                    <span className="text-muted-foreground">
                      {category.views} ({category.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement Rates */}
      {data?.engagementRates && data.stats.totalViews > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Engagement Rates
            </CardTitle>
            <CardDescription>How often you engage with videos you view</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-medium text-muted-foreground">Like Rate</div>
                </div>
                <div className="text-3xl font-bold">
                  {data.engagementRates.likeRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.stats.engagement.liked} of {data.stats.totalViews} videos
                </div>
              </div>
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-medium text-muted-foreground">Watchlist Rate</div>
                </div>
                <div className="text-3xl font-bold">
                  {data.engagementRates.watchlistRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.stats.engagement.addedToWatchlist} of {data.stats.totalViews} videos
                </div>
              </div>
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-medium text-muted-foreground">Playlist Rate</div>
                </div>
                <div className="text-3xl font-bold">
                  {data.engagementRates.playlistRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.stats.engagement.addedToPlaylist} of {data.stats.totalViews} videos
                </div>
              </div>
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-medium text-muted-foreground">Overall Engagement</div>
                </div>
                <div className="text-3xl font-bold">
                  {data.engagementRates.overallEngagementRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Any engagement action
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

