"use client";

import { useState } from "react";
import { Search, Lightbulb, TrendingUp, Video, BarChart3, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFormatAnalysis } from "@/hooks/use-format-inspiration";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

const FORMAT_LABELS: Record<string, string> = {
  tutorial: "Tutorial / How-To",
  list: "List / Top 10",
  review: "Review / Comparison",
  vlog: "Vlog / Personal",
  rant: "Rant / Opinion",
  documentary: "Documentary / Deep-Dive",
  reaction: "Reaction",
  challenge: "Challenge / Experiment",
  general: "General",
};

const FORMAT_COLORS: Record<string, string> = {
  tutorial: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  list: "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
  review: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  vlog: "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30",
  rant: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
  documentary: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
  reaction: "bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-500/30",
  challenge: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  general: "bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30",
};

export function FormatInspirationPageClient() {
  const [keyword, setKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);

  const { data: analysisData, isLoading: analysisLoading, error: analysisError } = useFormatAnalysis(
    activeKeyword,
    30,
    !!activeKeyword
  );

  // Generate recommendations from analysis data
  const recommendations = analysisData?.formatAnalysis
    ? analysisData.formatAnalysis
        .map((format) => ({
          format: format.format,
          videoCount: format.videoCount,
          avgEngagement: format.avgEngagement,
          avgViews: format.avgViews.toString(),
          recommendationScore: format.avgEngagement * 0.6 + (format.videoCount / 10) * 0.4,
        }))
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, 5)
    : [];

  const handleAnalyze = () => {
    if (keyword.trim()) {
      setActiveKeyword(keyword.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Format Inspiration Engine</h1>
          <p className="text-muted-foreground text-lg">
            Discover which video formats perform best for your topic and get inspiration for your next video.
          </p>
        </div>

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Analyze Topic</CardTitle>
            <CardDescription>
              Enter a keyword or topic to see which video formats work best
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="e.g., iPhone review, cooking tips, gaming"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && keyword.trim() && !analysisLoading) {
                      handleAnalyze();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={!keyword.trim() || analysisLoading}
                className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white"
              >
                {analysisLoading ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {analysisError && (
          <Card className="border-destructive mb-8">
            <CardContent className="py-12 text-center">
              <p className="text-destructive">
                {analysisError instanceof Error ? analysisError.message : "Failed to analyze formats. Please try again."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {analysisLoading ? (
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
        ) : analysisData ? (
          <Tabs defaultValue="formats" className="space-y-4">
            <TabsList>
              <TabsTrigger value="formats" className="cursor-pointer">Format Performance</TabsTrigger>
              <TabsTrigger value="recommendations" className="cursor-pointer">Recommendations</TabsTrigger>
              <TabsTrigger value="examples" className="cursor-pointer">Top Examples</TabsTrigger>
            </TabsList>

            <TabsContent value="formats" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysisData.formatAnalysis.map((format) => (
                  <Card key={format.format} className="hover:border-primary/50 transition-all">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {FORMAT_LABELS[format.format] || format.format}
                        </CardTitle>
                        <Badge className={cn("text-xs", FORMAT_COLORS[format.format] || FORMAT_COLORS.general)}>
                          {format.videoCount} videos
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Average Views</p>
                          <p className="text-2xl font-bold">
                            {format.avgViews >= 1000000
                              ? `${(format.avgViews / 1000000).toFixed(1)}M`
                              : format.avgViews >= 1000
                              ? `${(format.avgViews / 1000).toFixed(1)}K`
                              : format.avgViews.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Average Engagement</p>
                          <p className="text-2xl font-bold text-primary">
                            {format.avgEngagement.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              {!activeKeyword ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Analyze a topic first to see format recommendations.
                    </p>
                  </CardContent>
                </Card>
              ) : recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <Card key={rec.format} className="hover:border-primary/50 transition-all">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold",
                              index === 0 ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" :
                              index === 1 ? "bg-gray-400/20 text-gray-700 dark:text-gray-400" :
                              index === 2 ? "bg-orange-500/20 text-orange-700 dark:text-orange-400" :
                              "bg-muted"
                            )}>
                              {index + 1}
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {FORMAT_LABELS[rec.format] || rec.format}
                              </CardTitle>
                              <CardDescription>
                                {rec.videoCount} videos analyzed
                              </CardDescription>
                            </div>
                          </div>
                          <Badge className={cn("text-xs", FORMAT_COLORS[rec.format] || FORMAT_COLORS.general)}>
                            Recommended
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Avg Engagement</p>
                            <p className="text-xl font-bold text-primary">
                              {rec.avgEngagement.toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Avg Views</p>
                            <p className="text-xl font-bold">
                              {parseInt(rec.avgViews || "0", 10) >= 1000000
                                ? `${(parseInt(rec.avgViews || "0", 10) / 1000000).toFixed(1)}M`
                                : parseInt(rec.avgViews || "0", 10) >= 1000
                                ? `${(parseInt(rec.avgViews || "0", 10) / 1000).toFixed(1)}K`
                                : parseInt(rec.avgViews || "0", 10).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      No recommendations available for this topic. Try analyzing a different keyword.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="examples" className="space-y-4">
              <div className="space-y-6">
                {analysisData.formatAnalysis
                  .sort((a, b) => b.avgEngagement - a.avgEngagement)
                  .slice(0, 3)
                  .map((format) => (
                    <Card key={format.format}>
                      <CardHeader>
                        <CardTitle>{FORMAT_LABELS[format.format] || format.format}</CardTitle>
                        <CardDescription>
                          Top performing videos in this format
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {format.topVideos.map((video) => (
                            <Link
                              key={video.videoId}
                              href={`https://www.youtube.com/watch?v=${video.videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-4 p-3 border-2 rounded-lg hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer group"
                            >
                              {video.thumbnail ? (
                                <div className="relative w-40 h-24 flex-shrink-0 rounded overflow-hidden border-2">
                                  <Image
                                    src={video.thumbnail}
                                    alt={video.title}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              ) : (
                                <div className="w-40 h-24 flex-shrink-0 rounded bg-muted flex items-center justify-center border-2">
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
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to analyze</h3>
              <p className="text-muted-foreground">
                Enter a keyword or topic above to discover which video formats perform best for that topic.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
