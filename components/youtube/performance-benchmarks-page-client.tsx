"use client";

import { useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Target, Award, AlertCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBenchmarks, useBenchmarkComparison } from "@/hooks/use-performance-benchmarks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const CATEGORIES = [
  { value: "tech", label: "Technology" },
  { value: "gaming", label: "Gaming" },
  { value: "fitness", label: "Fitness" },
  { value: "food", label: "Food & Cooking" },
  { value: "travel", label: "Travel" },
  { value: "beauty", label: "Beauty" },
  { value: "education", label: "Education" },
  { value: "entertainment", label: "Entertainment" },
];

const PERFORMANCE_TIER_LABELS = {
  excellent: "Excellent",
  good: "Good",
  average: "Average",
  below_average: "Below Average",
};

const PERFORMANCE_TIER_COLORS = {
  excellent: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  good: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  average: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  below_average: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
};

export function PerformanceBenchmarksPageClient() {
  const [channelId, setChannelId] = useState("");
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | undefined>(undefined);

  const { data: benchmarksData, isLoading: benchmarksLoading } = useBenchmarks(category);
  const { data: comparisonData, isLoading: comparisonLoading, error: comparisonError } = useBenchmarkComparison(
    activeChannelId,
    category,
    !!activeChannelId
  );

  const handleCompare = () => {
    if (channelId.trim()) {
      // Extract channel ID from URL if needed
      let extractedId = channelId.trim();
      
      // Handle YouTube URL formats
      if (extractedId.includes("youtube.com") || extractedId.includes("youtu.be")) {
        const urlMatch = extractedId.match(/(?:youtube\.com\/channel\/|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        if (urlMatch) {
          extractedId = urlMatch[1];
        } else {
          // Try handle format
          const handleMatch = extractedId.match(/\/@([a-zA-Z0-9_-]+)/);
          if (handleMatch) {
            // Resolve handle to channel ID
            fetch(`/api/youtube/channels/resolve?handle=${encodeURIComponent(handleMatch[1])}`)
              .then((res) => res.json())
              .then((data) => {
                if (data.channelId) {
                  setActiveChannelId(data.channelId);
                } else {
                  toast.error("Failed to resolve channel handle");
                }
              })
              .catch(() => toast.error("Failed to resolve channel handle"));
            return;
          } else {
            toast.error("Invalid YouTube URL");
            return;
          }
        }
      }
      
      // Validate it's a proper channel ID
      if (!extractedId.startsWith("UC") || extractedId.length !== 24) {
        toast.error("Invalid channel ID. Must start with UC and be 24 characters.");
        return;
      }
      
      setActiveChannelId(extractedId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Performance Benchmarking</h1>
          <p className="text-muted-foreground text-lg">
            Compare your channel's performance against industry benchmarks and see how you rank.
          </p>
        </div>

        <Tabs defaultValue="benchmarks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="benchmarks" className="cursor-pointer">Industry Benchmarks</TabsTrigger>
            <TabsTrigger value="compare" className="cursor-pointer">Compare Channel</TabsTrigger>
          </TabsList>

          <TabsContent value="benchmarks" className="space-y-4">
            {/* Category Filter */}
            <Card>
              <CardHeader>
                <CardTitle>Benchmark Metrics</CardTitle>
                <CardDescription>
                  Industry averages and percentiles for channel performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={category || "all"} onValueChange={(value) => setCategory(value === "all" ? undefined : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {benchmarksLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : benchmarksData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Average Views</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <p className="text-2xl font-bold">
                              {benchmarksData.benchmarks.avgViews >= 1000000
                                ? `${(benchmarksData.benchmarks.avgViews / 1000000).toFixed(1)}M`
                                : benchmarksData.benchmarks.avgViews >= 1000
                                ? `${(benchmarksData.benchmarks.avgViews / 1000).toFixed(1)}K`
                                : benchmarksData.benchmarks.avgViews.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">Industry average</p>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">25th percentile</span>
                              <span className="font-medium">
                                {benchmarksData.benchmarks.p25Views >= 1000000
                                  ? `${(benchmarksData.benchmarks.p25Views / 1000000).toFixed(1)}M`
                                  : benchmarksData.benchmarks.p25Views >= 1000
                                  ? `${(benchmarksData.benchmarks.p25Views / 1000).toFixed(1)}K`
                                  : benchmarksData.benchmarks.p25Views.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Median (50th)</span>
                              <span className="font-medium">
                                {benchmarksData.benchmarks.medianViews >= 1000000
                                  ? `${(benchmarksData.benchmarks.medianViews / 1000000).toFixed(1)}M`
                                  : benchmarksData.benchmarks.medianViews >= 1000
                                  ? `${(benchmarksData.benchmarks.medianViews / 1000).toFixed(1)}K`
                                  : benchmarksData.benchmarks.medianViews.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">75th percentile</span>
                              <span className="font-medium">
                                {benchmarksData.benchmarks.p75Views >= 1000000
                                  ? `${(benchmarksData.benchmarks.p75Views / 1000000).toFixed(1)}M`
                                  : benchmarksData.benchmarks.p75Views >= 1000
                                  ? `${(benchmarksData.benchmarks.p75Views / 1000).toFixed(1)}K`
                                  : benchmarksData.benchmarks.p75Views.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Average Engagement</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <p className="text-2xl font-bold text-primary">
                              {benchmarksData.benchmarks.avgEngagement.toFixed(2)}%
                            </p>
                            <p className="text-xs text-muted-foreground">Industry average</p>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">25th percentile</span>
                              <span className="font-medium">{benchmarksData.benchmarks.p25Engagement.toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Median (50th)</span>
                              <span className="font-medium">{benchmarksData.benchmarks.medianEngagement.toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">75th percentile</span>
                              <span className="font-medium">{benchmarksData.benchmarks.p75Engagement.toFixed(2)}%</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Upload Frequency</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <p className="text-2xl font-bold">
                              {benchmarksData.benchmarks.avgUploadFrequency.toFixed(1)}
                            </p>
                            <p className="text-xs text-muted-foreground">Videos per week</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Based on {benchmarksData.sampleSize} channel{benchmarksData.sampleSize !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No benchmark data available yet. Run channel diagnostics to build benchmark data.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compare" className="space-y-4">
            {/* Channel Input */}
            <Card>
              <CardHeader>
                <CardTitle>Compare Your Channel</CardTitle>
                <CardDescription>
                  Enter a channel ID or URL to compare against industry benchmarks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Channel ID (UC...) or YouTube URL"
                      value={channelId}
                      onChange={(e) => setChannelId(e.target.value)}
                      className="pl-10"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && channelId.trim() && !comparisonLoading) {
                          handleCompare();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleCompare}
                    disabled={!channelId.trim() || comparisonLoading}
                    className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white"
                  >
                    {comparisonLoading ? "Comparing..." : "Compare"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: Channel must have been analyzed using the Channel Diagnostic tool first.
                </p>
              </CardContent>
            </Card>

            {/* Comparison Results */}
            {comparisonError && (
              <Card className="border-destructive">
                <CardContent className="py-12 text-center">
                  <p className="text-destructive">
                    {comparisonError instanceof Error ? comparisonError.message : "Failed to compare channel"}
                  </p>
                </CardContent>
              </Card>
            )}

            {comparisonLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : comparisonData ? (
              <div className="space-y-4">
                {/* Performance Score */}
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Performance Score</CardTitle>
                    <CardDescription>
                      Your channel's performance compared to industry benchmarks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Performance Score</span>
                          <span className="text-2xl font-bold">{comparisonData.comparison.performanceScore}/100</span>
                        </div>
                        <Progress value={comparisonData.comparison.performanceScore} className="h-3" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-sm", PERFORMANCE_TIER_COLORS[comparisonData.comparison.performanceTier])}>
                          {PERFORMANCE_TIER_LABELS[comparisonData.comparison.performanceTier]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Based on {comparisonData.sampleSize} channels
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Metrics Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Average Views</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-2xl font-bold">
                            {comparisonData.channelMetrics.avgViews >= 1000000
                              ? `${(comparisonData.channelMetrics.avgViews / 1000000).toFixed(1)}M`
                              : comparisonData.channelMetrics.avgViews >= 1000
                              ? `${(comparisonData.channelMetrics.avgViews / 1000).toFixed(1)}K`
                              : comparisonData.channelMetrics.avgViews.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Your channel</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {comparisonData.comparison.viewsPercentile}th percentile
                          </Badge>
                          {comparisonData.comparison.viewsVsAverage !== 0 && (
                            <div className="flex items-center gap-1 text-xs">
                              {comparisonData.comparison.viewsVsAverage > 0 ? (
                                <>
                                  <TrendingUp className="h-3 w-3 text-green-500" />
                                  <span className="text-green-500">
                                    {Math.abs(comparisonData.comparison.viewsVsAverage).toFixed(1)}% above average
                                  </span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="h-3 w-3 text-red-500" />
                                  <span className="text-red-500">
                                    {Math.abs(comparisonData.comparison.viewsVsAverage).toFixed(1)}% below average
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Industry average</p>
                          <p className="text-sm font-medium">
                            {comparisonData.benchmarks.avgViews >= 1000000
                              ? `${(comparisonData.benchmarks.avgViews / 1000000).toFixed(1)}M`
                              : comparisonData.benchmarks.avgViews >= 1000
                              ? `${(comparisonData.benchmarks.avgViews / 1000).toFixed(1)}K`
                              : comparisonData.benchmarks.avgViews.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Average Engagement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-2xl font-bold text-primary">
                            {comparisonData.channelMetrics.avgEngagement.toFixed(2)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Your channel</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {comparisonData.comparison.engagementPercentile}th percentile
                          </Badge>
                          {comparisonData.comparison.engagementVsAverage !== 0 && (
                            <div className="flex items-center gap-1 text-xs">
                              {comparisonData.comparison.engagementVsAverage > 0 ? (
                                <>
                                  <TrendingUp className="h-3 w-3 text-green-500" />
                                  <span className="text-green-500">
                                    {Math.abs(comparisonData.comparison.engagementVsAverage).toFixed(1)}% above average
                                  </span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="h-3 w-3 text-red-500" />
                                  <span className="text-red-500">
                                    {Math.abs(comparisonData.comparison.engagementVsAverage).toFixed(1)}% below average
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Industry average</p>
                          <p className="text-sm font-medium">
                            {comparisonData.benchmarks.avgEngagement.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Percentile Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Percentile Rankings</CardTitle>
                    <CardDescription>
                      Where your channel ranks compared to other channels
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Views Ranking</span>
                          <span className="text-lg font-bold">{comparisonData.comparison.viewsPercentile}th percentile</span>
                        </div>
                        <Progress value={comparisonData.comparison.viewsPercentile} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Better than {100 - comparisonData.comparison.viewsPercentile}% of channels
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Engagement Ranking</span>
                          <span className="text-lg font-bold">{comparisonData.comparison.engagementPercentile}th percentile</span>
                        </div>
                        <Progress value={comparisonData.comparison.engagementPercentile} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Better than {100 - comparisonData.comparison.engagementPercentile}% of channels
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ready to compare</h3>
                  <p className="text-muted-foreground">
                    Enter a channel ID or URL above to see how it performs against industry benchmarks.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
