"use client";

import { useState } from "react";
import { Search, TrendingUp, Video, Calendar, Eye, BarChart3, Target, Zap, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChannelDiagnostic } from "@/hooks/use-channel-diagnostic";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function ChannelDiagnosticPageClient() {
  const [channelId, setChannelId] = useState("");
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const { data, isLoading, error } = useChannelDiagnostic(activeChannelId, !!activeChannelId);

  const resolveChannelId = async (input: string): Promise<string | null> => {
    const trimmed = input.trim();
    
    // If it's already a channel ID (starts with UC and is 24 chars)
    if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) {
      return trimmed;
    }

    // Extract from URL formats
    if (trimmed.includes("youtube.com")) {
      // Extract from /channel/UC... format
      const channelMatch = trimmed.match(/\/channel\/([a-zA-Z0-9_-]+)/);
      if (channelMatch && channelMatch[1].startsWith("UC")) {
        return channelMatch[1];
      }

      // Extract handle from /@... format
      const handleMatch = trimmed.match(/\/@([a-zA-Z0-9_-]+)/);
      if (handleMatch) {
        const handle = handleMatch[1];
        // Resolve handle using forHandle API
        try {
          const response = await fetch(`/api/youtube/channels/resolve?handle=${encodeURIComponent(handle)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.channelId) {
              return data.channelId;
            }
          }
        } catch (err) {
          console.error("Error resolving handle:", err);
        }
        return null;
      }

      // Extract from /c/... or /user/... format
      // These might not work with forHandle, so try search as fallback
      const customMatch = trimmed.match(/\/(?:c|user)\/([a-zA-Z0-9_-]+)/);
      if (customMatch) {
        const customUrl = customMatch[1];
        // First try forHandle (in case custom URL matches handle)
        try {
          const response = await fetch(`/api/youtube/channels/resolve?handle=${encodeURIComponent(customUrl)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.channelId) {
              return data.channelId;
            }
          }
        } catch (err) {
          console.error("Error resolving custom URL:", err);
        }
        // Fallback to search
        try {
          const response = await fetch(`/api/youtube/channels/search?q=${encodeURIComponent(customUrl)}&maxResults=1`);
          if (response.ok) {
            const data = await response.json();
            if (data.channels && data.channels.length > 0) {
              return data.channels[0].channelId;
            }
          }
        } catch (err) {
          console.error("Error searching custom URL:", err);
        }
        return null;
      }
    }

    // If it's just a handle (starts with @)
    if (trimmed.startsWith("@")) {
      const handle = trimmed.slice(1);
      try {
        const response = await fetch(`/api/youtube/channels/resolve?handle=${encodeURIComponent(handle)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.channelId) {
            return data.channelId;
          }
        }
      } catch (err) {
        console.error("Error resolving handle:", err);
      }
      return null;
    }

    // Try forHandle first (in case it's a handle without @)
    try {
      const response = await fetch(`/api/youtube/channels/resolve?handle=${encodeURIComponent(trimmed)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.channelId) {
          return data.channelId;
        }
      }
    } catch (err) {
      // Ignore and try search
    }

    // Fallback: Try searching for it as a channel name
    try {
      const response = await fetch(`/api/youtube/channels/search?q=${encodeURIComponent(trimmed)}&maxResults=1`);
      if (response.ok) {
        const data = await response.json();
        if (data.channels && data.channels.length > 0) {
          return data.channels[0].channelId;
        }
      }
    } catch (err) {
      console.error("Error searching channel:", err);
    }

    return null;
  };

  const handleAnalyze = async () => {
    if (!channelId.trim()) return;

    setIsResolving(true);
    setResolveError(null);
    setActiveChannelId(null);

    try {
      const resolvedId = await resolveChannelId(channelId);
      
      if (resolvedId) {
        setActiveChannelId(resolvedId);
      } else {
        setResolveError("Could not find channel. Please check the URL or channel ID and try again.");
      }
    } catch (err) {
      setResolveError("Failed to resolve channel. Please try again.");
      console.error("Error resolving channel:", err);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Channel Diagnostic Tool</h1>
          <p className="text-muted-foreground text-lg">
            Analyze competitor channels to discover success patterns, upload consistency, and engagement strategies.
          </p>
        </div>

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Analyze Channel</CardTitle>
            <CardDescription>
              Enter a YouTube channel ID or URL to analyze performance patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="https://www.youtube.com/@channelname or UC..."
                    value={channelId}
                    onChange={(e) => {
                      setChannelId(e.target.value);
                      setResolveError(null);
                    }}
                    className="pl-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && channelId.trim() && !isResolving && !isLoading) {
                        handleAnalyze();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleAnalyze}
                  disabled={!channelId.trim() || isLoading || isResolving}
                  className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white"
                >
                  {isResolving ? "Resolving..." : isLoading ? "Analyzing..." : "Analyze"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supports: Channel URL (youtube.com/@channelname), Channel ID (UC...), or channel name
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {(resolveError || error) && (
          <Card className="border-destructive">
            <CardContent className="py-12 text-center">
              <p className="text-destructive">
                {resolveError || (error instanceof Error ? error.message : "Failed to analyze channel. Please try again.")}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {resolveError 
                  ? "Please check the URL format and try again."
                  : "Make sure the channel ID is correct and the channel is public."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {isLoading || isResolving ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : data ? (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
              <TabsTrigger value="videos">Top Videos</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Channel Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Channel Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    {data.channel.thumbnail ? (
                      <div className="relative w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={data.channel.thumbnail}
                          alt={data.channel.title}
                          fill
                          className="object-cover"
                          sizes="96px"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Video className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{data.channel.title}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Subscribers</p>
                          <p className="font-semibold">{parseInt(data.channel.subscriberCount || "0", 10).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Videos</p>
                          <p className="font-semibold">{parseInt(data.channel.videoCount || "0", 10).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Views</p>
                          <p className="font-semibold">{parseInt(data.channel.viewCount || "0", 10).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Average Views</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-muted-foreground" />
                      <p className="text-2xl font-bold">
                        {parseInt(data.diagnostic.avgViews || "0", 10).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Average Engagement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      <p className="text-2xl font-bold">
                        {data.diagnostic.avgEngagement.toFixed(2)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Upload Frequency</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <p className="text-2xl font-bold">
                        {data.diagnostic.uploadFrequency.toFixed(1)}
                      </p>
                      <p className="text-sm text-muted-foreground">videos/week</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Most Common Format</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-muted-foreground" />
                        <p className="text-lg font-semibold">
                          {data.diagnostic.bestFormat || "Mixed Content"}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Based on title patterns
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Growth Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Subscribers per Video</p>
                        <p className="text-2xl font-bold">
                          {data.diagnostic.subscriberGrowthRate >= 1000
                            ? `${(data.diagnostic.subscriberGrowthRate / 1000).toFixed(1)}K`
                            : Math.round(data.diagnostic.subscriberGrowthRate).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Total subscribers ÷ total videos
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Average Views per Video</p>
                        <p className="text-2xl font-bold">
                          {data.diagnostic.viewGrowthRate >= 1000000
                            ? `${(data.diagnostic.viewGrowthRate / 1000000).toFixed(1)}M`
                            : data.diagnostic.viewGrowthRate >= 1000
                            ? `${(data.diagnostic.viewGrowthRate / 1000).toFixed(1)}K`
                            : Math.round(data.diagnostic.viewGrowthRate).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Total views ÷ total videos
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Upload Consistency</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Videos Per Week</p>
                        <p className="text-2xl font-bold">
                          {data.diagnostic.uploadFrequency.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Videos Analyzed</p>
                        <p className="text-2xl font-bold">{data.totalVideosAnalyzed}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="patterns" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Title Patterns</CardTitle>
                    <CardDescription>
                      Common patterns found in video titles
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.diagnostic.avgTitleLength && (
                        <div className="pb-3 border-b">
                          <p className="text-sm text-muted-foreground mb-1">Average Title Length</p>
                          <p className="text-2xl font-bold">
                            {Math.round(data.diagnostic.avgTitleLength)} characters
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Longer titles often perform better
                          </p>
                        </div>
                      )}
                      <div className="space-y-3">
                        {data.diagnostic.percentWithBrackets !== undefined && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div>
                              <span className="text-sm font-medium">Titles with Brackets</span>
                              <p className="text-xs text-muted-foreground">
                                e.g., [2024] or (NEW)
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-sm">
                              {data.diagnostic.percentWithBrackets.toFixed(0)}%
                            </Badge>
                          </div>
                        )}
                        {data.diagnostic.percentWithNumbers !== undefined && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div>
                              <span className="text-sm font-medium">Titles with Numbers</span>
                              <p className="text-xs text-muted-foreground">
                                e.g., Top 10, 5 Ways
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-sm">
                              {data.diagnostic.percentWithNumbers.toFixed(0)}%
                            </Badge>
                          </div>
                        )}
                        {data.diagnostic.percentWithQuestions !== undefined && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div>
                              <span className="text-sm font-medium">Question Titles</span>
                              <p className="text-xs text-muted-foreground">
                                e.g., How to... or What is...?
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-sm">
                              {data.diagnostic.percentWithQuestions.toFixed(0)}%
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Thumbnail Patterns</CardTitle>
                    <CardDescription>
                      Visual elements in video thumbnails
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.diagnostic.percentWithFaces !== undefined && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div>
                            <span className="text-sm font-medium">Thumbnails with Faces</span>
                            <p className="text-xs text-muted-foreground">
                              Human faces increase click-through rates
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-sm">
                            {data.diagnostic.percentWithFaces.toFixed(0)}%
                          </Badge>
                        </div>
                      )}
                      {data.diagnostic.percentWithText !== undefined && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div>
                            <span className="text-sm font-medium">Thumbnails with Text</span>
                            <p className="text-xs text-muted-foreground">
                              Text overlays can improve engagement
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-sm">
                            {data.diagnostic.percentWithText.toFixed(0)}%
                          </Badge>
                        </div>
                      )}
                      {data.diagnostic.percentWithFaces === undefined && data.diagnostic.percentWithText === undefined && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Thumbnail analysis data not available
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="videos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Videos</CardTitle>
                  <CardDescription>
                    Top {data.topVideos.length} videos by views and engagement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.topVideos.map((video) => (
                      <Link
                        key={video.videoId}
                        href={`https://www.youtube.com/watch?v=${video.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-3 border-2 rounded-lg hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer group"
                      >
                        {video.thumbnail ? (
                          <div className="relative w-40 h-24 flex-shrink-0 rounded overflow-hidden bg-muted">
                            <Image
                              src={video.thumbnail}
                              alt={video.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                              sizes="160px"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="relative w-40 h-24 flex-shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
                            <Video className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                              {video.title}
                            </h4>
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {video.viewCount.toLocaleString()} views
                            </span>
                            <span>•</span>
                            <span className="text-primary font-medium">
                              {video.engagementRate.toFixed(2)}% engagement
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(video.publishedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : !activeChannelId && !resolveError && !error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to analyze</h3>
              <p className="text-muted-foreground">
                Enter a channel ID or URL above to analyze performance patterns and discover success strategies.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
