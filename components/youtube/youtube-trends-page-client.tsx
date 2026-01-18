"use client";

import { useState } from "react";
import { TrendingUp, Search, ArrowUp, ArrowDown, Minus, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useYouTubeTrends } from "@/hooks/use-youtube-trends";
import { useQueryClient } from "@tanstack/react-query";

export function YouTubeTrendsPageClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useYouTubeTrends(period, 20, category, 0);
  const trends = data?.trends || [];

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["youtube-trends"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Trending Topics</h1>
          <p className="text-muted-foreground text-lg">
            Discover trending keywords and topics on YouTube. Track momentum and find content opportunities.
          </p>
          <div className="mt-4">
            <Button
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-2 cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              Refresh Trends
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for keywords or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  // Filter trends client-side
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={(value: "daily" | "weekly" | "monthly") => setPeriod(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category || "all"} onValueChange={(value) => setCategory(value === "all" ? undefined : value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="tech">Technology</SelectItem>
                <SelectItem value="gaming">Gaming</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="education">Education</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="py-12 text-center">
              <p className="text-destructive mb-2">Failed to load trends.</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Please try again later."}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Make sure trend calculation has been run. Check Dashboard → Admin → YouTube Jobs
              </p>
            </CardContent>
          </Card>
        )}

        {/* Trends Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : trends.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No trends available yet</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? `No trends found matching "${searchQuery}". Try a different search term.`
                  : "Trend data will appear here once we start collecting video snapshots and calculating trends."}
              </p>
              {!searchQuery && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>To get trends, you need to:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Run the "Collect Video Snapshots" job</li>
                    <li>Then run the "Calculate Trends" job</li>
                  </ol>
                  <p className="mt-2">You can trigger these jobs from: Dashboard → Admin → YouTube Jobs</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filtered results count */}
            {searchQuery && (
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {trends.filter((t) => t.keyword.toLowerCase().includes(searchQuery.toLowerCase())).length} of {trends.length} trends
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trends
                .filter((trend) => !searchQuery || trend.keyword.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((trend, index) => {
                  const momentumIcon =
                    trend.momentum > 0 ? (
                      <ArrowUp className="h-4 w-4 text-green-500" />
                    ) : trend.momentum < 0 ? (
                      <ArrowDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    );

                  return (
                    <Card key={trend.id || index} className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{trend.keyword}</CardTitle>
                            {trend.category && (
                              <Badge variant="secondary" className="mt-2">
                                {trend.category}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {momentumIcon}
                            <span
                              className={cn(
                                "text-sm font-medium",
                                trend.momentum > 0
                                  ? "text-green-500"
                                  : trend.momentum < 0
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                              )}
                            >
                              {trend.momentum > 0 ? "+" : ""}
                              {trend.momentum.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Search Volume:</span>
                            <span className="font-medium">{trend.searchVolume.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Videos:</span>
                            <span className="font-medium">{trend.videoCount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Views:</span>
                            <span className="font-medium">{parseInt(trend.avgViews || "0", 10).toLocaleString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
