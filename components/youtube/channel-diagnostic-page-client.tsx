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

  const { data, isLoading, error } = useChannelDiagnostic(activeChannelId, !!activeChannelId);

  const handleAnalyze = () => {
    if (channelId.trim()) {
      // Extract channel ID from URL if provided
      let extractedId = channelId.trim();
      
      // Handle different URL formats
      if (channelId.includes("youtube.com")) {
        const urlMatch = channelId.match(/(?:channel\/|user\/|@)([^/?]+)/);
        if (urlMatch) {
          extractedId = urlMatch[1];
        }
      }
      
      // If it starts with UC, it's already a channel ID
      if (extractedId.startsWith("UC")) {
        setActiveChannelId(extractedId);
      } else {
        // Try to find channel by handle/slug
        // For now, assume it's a channel ID
        setActiveChannelId(extractedId);
      }
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
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter channel ID (e.g., UC...) or channel URL"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && channelId.trim()) {
                      handleAnalyze();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={!channelId.trim() || isLoading}
                className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white"
              >
                {isLoading ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="py-12 text-center">
              <p className="text-destructive">
                {error instanceof Error ? error.message : "Failed to analyze channel. Please try again."}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Make sure the channel ID is correct and the channel is public.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {isLoading ? (
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
                    {data.channel.thumbnail && (
                      <div className="relative w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={data.channel.thumbnail}
                          alt={data.channel.title}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
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
                    <CardDescription>Best Format</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-muted-foreground" />
                      <p className="text-lg font-semibold">
                        {data.diagnostic.bestFormat || "N/A"}
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
                        <p className="text-sm text-muted-foreground mb-1">Subscriber Growth Rate</p>
                        <p className="text-2xl font-bold">
                          {data.diagnostic.subscriberGrowthRate.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">View Growth Rate</p>
                        <p className="text-2xl font-bold">
                          {data.diagnostic.viewGrowthRate.toFixed(2)}
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
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.diagnostic.avgTitleLength && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Average Title Length</p>
                          <p className="text-2xl font-bold">
                            {Math.round(data.diagnostic.avgTitleLength)} chars
                          </p>
                        </div>
                      )}
                      <div className="space-y-2">
                        {data.diagnostic.percentWithBrackets !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Use Brackets</span>
                            <Badge variant="secondary">
                              {data.diagnostic.percentWithBrackets.toFixed(1)}%
                            </Badge>
                          </div>
                        )}
                        {data.diagnostic.percentWithNumbers !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Use Numbers</span>
                            <Badge variant="secondary">
                              {data.diagnostic.percentWithNumbers.toFixed(1)}%
                            </Badge>
                          </div>
                        )}
                        {data.diagnostic.percentWithQuestions !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Ask Questions</span>
                            <Badge variant="secondary">
                              {data.diagnostic.percentWithQuestions.toFixed(1)}%
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
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {data.diagnostic.percentWithFaces !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Videos with Faces</span>
                          <Badge variant="secondary">
                            {data.diagnostic.percentWithFaces.toFixed(1)}%
                          </Badge>
                        </div>
                      )}
                      {data.diagnostic.percentWithText !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Videos with Text</span>
                          <Badge variant="secondary">
                            {data.diagnostic.percentWithText.toFixed(1)}%
                          </Badge>
                        </div>
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
                        className="flex items-center gap-4 p-3 border rounded-lg hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer group"
                      >
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
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to analyze</h3>
              <p className="text-muted-foreground">
                Enter a channel ID or URL above to analyze performance patterns and discover success strategies.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
