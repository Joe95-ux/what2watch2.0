"use client";

import { Sparkles, TrendingUp, BarChart3, Lightbulb, Zap, Target, Bell, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useYouTubeTrends } from "@/hooks/use-youtube-trends";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function YouTubeInsightsPageClient() {
  // Get top trending topics - use lower minMomentum to show more results
  const { data: trendsData, isLoading: trendsLoading, error: trendsError } = useYouTubeTrends("daily", 5, undefined, 0);
  const topTrends = trendsData?.trends || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Content Insights</h1>
          <p className="text-muted-foreground text-lg">
            Get data-driven insights about YouTube content performance, trends, and opportunities.
          </p>
        </div>

        {/* Insights Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="cursor-pointer">Overview</TabsTrigger>
            <TabsTrigger value="opportunities" className="cursor-pointer">Opportunities</TabsTrigger>
            <TabsTrigger value="performance" className="cursor-pointer">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Trending Now</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">
                    Top trending topics and keywords in your niche.
                  </p>
                  <Link href="/youtube/trends" className="cursor-pointer">
                    <Button size="sm" className="w-full cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white">
                      View All Trends
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Title Analyzer</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">
                    Analyze top-performing video titles and thumbnails.
                  </p>
                  <Link href="/youtube/analyzer" className="cursor-pointer">
                    <Button variant="outline" size="sm" className="w-full cursor-pointer">
                      Try Analyzer
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Format Inspiration</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">
                    Discover which video formats work best for your topic.
                  </p>
                  <Link href="/youtube/formats" className="cursor-pointer">
                    <Button variant="outline" size="sm" className="w-full cursor-pointer">
                      Try Format Inspiration
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Top Trending Topics */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Top Trending Topics</CardTitle>
                    <CardDescription>Highest momentum keywords today</CardDescription>
                  </div>
                  <Link href="/youtube/trends" className="cursor-pointer">
                    <Button size="sm" className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : trendsError ? (
                  <p className="text-destructive text-center py-4">
                    Failed to load trends. Please try again later.
                  </p>
                ) : topTrends.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">
                      No trending topics yet.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Trends will appear once snapshot collection and trend calculation jobs have run.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-3">
                    {topTrends.map((trend) => (
                      <Link
                        key={trend.id}
                        href={`/youtube/trends?keyword=${encodeURIComponent(trend.keyword)}`}
                        className="cursor-pointer block"
                      >
                        <div className="flex items-center justify-between p-3 border-2 rounded-lg hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{trend.keyword}</span>
                              {trend.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {trend.category}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {trend.videoCount} videos • {parseInt(trend.avgViews || "0", 10).toLocaleString()} avg views
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {trend.momentum > 0 ? (
                              <Badge variant="default" className="bg-green-500">
                                +{trend.momentum.toFixed(1)}%
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                {trend.momentum.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Trend Alerts</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">
                    Get notified when keywords in your niche start trending.
                  </p>
                  <Link href="/youtube/alerts" className="cursor-pointer">
                    <Button variant="outline" size="sm" className="w-full cursor-pointer">
                      Manage Alerts
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Performance Benchmarks</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">
                    Compare your channel's performance against industry benchmarks.
                  </p>
                  <Link href="/youtube/benchmarks" className="cursor-pointer">
                    <Button variant="outline" size="sm" className="w-full cursor-pointer">
                      View Benchmarks
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle>Content Opportunities</CardTitle>
                </div>
                <CardDescription>
                  High-demand topics with low competition
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Discover content gaps where demand exceeds supply. Find trending topics with low competition.
                  </p>
                  <div className="flex items-center gap-3">
                    <Link href="/youtube/gaps" className="cursor-pointer">
                      <Button size="default" className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white">
                        <Target className="h-4 w-4 mr-2" />
                        Find Content Gaps
                      </Button>
                    </Link>
                  </div>
                  <div className="p-4 border-2 rounded-lg bg-muted/50">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">How it works</p>
                        <p className="text-sm text-muted-foreground">
                          We compare high-volume search queries against existing video coverage
                          to find topics with high demand but low supply - perfect opportunities
                          for new content.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
                <CardDescription>
                  Analyze what makes videos successful
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Performance insights will appear here once we start analyzing video data.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
