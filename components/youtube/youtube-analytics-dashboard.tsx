"use client";

import { useState } from "react";
import { BarChart3, Eye, Clock, Heart, Bookmark, List, TrendingUp } from "lucide-react";
import { useYouTubeAnalytics } from "@/hooks/use-youtube-analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function YouTubeAnalyticsDashboard() {
  const [period, setPeriod] = useState("30");
  const { data, isLoading } = useYouTubeAnalytics(parseInt(period, 10));

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
                <div className="space-y-2">
                  {data.topVideos.slice(0, 5).map((video, index) => (
                    <div key={video.videoId} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">#{index + 1}</span>
                      <span className="flex-1 mx-2 truncate">Video {video.videoId.slice(0, 8)}...</span>
                      <span className="text-muted-foreground">{video.viewCount} views</span>
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
                <div className="space-y-2">
                  {data.topChannels.slice(0, 5).map((channel, index) => (
                    <div key={channel.channelId} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">#{index + 1}</span>
                      <span className="flex-1 mx-2 truncate">Channel {channel.channelId.slice(0, 8)}...</span>
                      <span className="text-muted-foreground">{channel.viewCount} views</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

