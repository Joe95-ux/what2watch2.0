"use client";

import { useState, useMemo, useEffect } from "react";
import { BarChart3, Eye, Clock, Heart, Bookmark, List, TrendingUp, Play } from "lucide-react";
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

      {/* Views Over Time Chart */}
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
            <ChartContainer config={chartConfig} className="h-[300px]">
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

      {/* Engagement Breakdown */}
      {engagementData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Engagement Breakdown
              </CardTitle>
              <CardDescription>How you interact with videos</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px]">
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

          {/* Completion Rate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Completion Rate
              </CardTitle>
              <CardDescription>Percentage of videos watched to completion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-[250px]">
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="hsl(var(--muted))"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="hsl(142 72% 45%)"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - stats.completionRate / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {stats.completedViews} of {stats.totalViews} videos completed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Videos and Channels */}
      {data && (data.topVideos.length > 0 || data.topChannels.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.topVideos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Videos
                </CardTitle>
                <CardDescription>Most viewed videos</CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}

          {data.topChannels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Top Channels
                </CardTitle>
                <CardDescription>Most viewed channels</CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Peak Watching Times */}
      {data?.peakWatchingTimes && data.stats.totalViews > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Peak Watching Hours
              </CardTitle>
              <CardDescription>When you watch videos most (by hour of day)</CardDescription>
            </CardHeader>
            <CardContent className="pl-2 sm:pl-4">
              <ChartContainer config={chartConfig} className="h-[250px]">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Peak Watching Days
              </CardTitle>
              <CardDescription>When you watch videos most (by day of week)</CardDescription>
            </CardHeader>
            <CardContent className="pl-2 sm:pl-4">
              <ChartContainer config={chartConfig} className="h-[250px]">
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Source and Category Breakdown */}
      {data && (data.sourceBreakdown.length > 0 || data.categoryBreakdown.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.sourceBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Source Breakdown
                </CardTitle>
                <CardDescription>Where you discover videos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.sourceBreakdown.map((source, index) => (
                    <div key={source.source} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{source.source}</span>
                        <span className="text-muted-foreground">
                          {source.views} ({source.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${source.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {data.categoryBreakdown.length > 0 && (
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
        </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Like Rate</div>
                <div className="text-2xl font-bold">
                  {data.engagementRates.likeRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.stats.engagement.liked} of {data.stats.totalViews} videos
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Watchlist Rate</div>
                <div className="text-2xl font-bold">
                  {data.engagementRates.watchlistRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.stats.engagement.addedToWatchlist} of {data.stats.totalViews} videos
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Playlist Rate</div>
                <div className="text-2xl font-bold">
                  {data.engagementRates.playlistRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.stats.engagement.addedToPlaylist} of {data.stats.totalViews} videos
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Overall Engagement</div>
                <div className="text-2xl font-bold">
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

