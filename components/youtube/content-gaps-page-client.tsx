"use client";

import { useState } from "react";
import { Search, Target, TrendingUp, Video, Calendar, Eye, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContentGaps, useDetectContentGaps } from "@/hooks/use-content-gaps";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export function ContentGapsPageClient() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [minScore, setMinScore] = useState(0);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useContentGaps(category, 30, minScore);
  const gaps = data?.gaps || [];

  const {
    data: detectData,
    isLoading: isDetecting,
    refetch: detectGaps,
  } = useDetectContentGaps(category, 30, false);

  const handleDetect = () => {
    detectGaps().then(() => {
      // Refetch stored gaps after detection
      queryClient.invalidateQueries({ queryKey: ["content-gaps"] });
    });
  };

  const getGapScoreColor = (score: number) => {
    if (score >= 10) return "text-green-600 dark:text-green-400";
    if (score >= 5) return "text-blue-600 dark:text-blue-400";
    if (score >= 2) return "text-yellow-600 dark:text-yellow-400";
    return "text-muted-foreground";
  };

  const getGapScoreBadge = (score: number) => {
    if (score >= 10) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 5) return <Badge className="bg-blue-500">Good</Badge>;
    if (score >= 2) return <Badge variant="secondary">Fair</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Content Gap Finder</h1>
          <p className="text-muted-foreground text-lg">
            Discover high-demand topics with low competition. Find content opportunities that are trending but underserved.
          </p>
        </div>

        {/* Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <Select value={category || "all"} onValueChange={(value) => setCategory(value === "all" ? undefined : value)}>
              <SelectTrigger className="w-[180px]">
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
            <Select
              value={minScore.toString()}
              onValueChange={(value) => setMinScore(parseFloat(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Min Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any Score</SelectItem>
                <SelectItem value="2">Score ≥ 2</SelectItem>
                <SelectItem value="5">Score ≥ 5</SelectItem>
                <SelectItem value="10">Score ≥ 10</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleDetect}
            disabled={isDetecting}
            className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white"
          >
            {isDetecting ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-pulse" />
                Detecting...
              </>
            ) : (
              <>
                <Target className="h-4 w-4 mr-2" />
                Detect New Gaps
              </>
            )}
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="py-12 text-center">
              <p className="text-destructive">Failed to load content gaps. Please try again later.</p>
            </CardContent>
          </Card>
        )}

        {/* Gaps Grid */}
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
        ) : gaps.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No content gaps found</h3>
              <p className="text-muted-foreground mb-4">
                {minScore > 0
                  ? `No gaps found with score ≥ ${minScore}. Try lowering the minimum score.`
                  : "Click 'Detect New Gaps' to find content opportunities."}
              </p>
              <Button
                onClick={handleDetect}
                disabled={isDetecting}
                className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white"
              >
                <Target className="h-4 w-4 mr-2" />
                Detect Gaps
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Found {gaps.length} content {gaps.length === 1 ? "gap" : "gaps"}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gaps.map((gap) => (
                <Card key={gap.id} className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{gap.keyword}</CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          {getGapScoreBadge(gap.gapScore)}
                          {gap.category && (
                            <Badge variant="secondary" className="text-xs">
                              {gap.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className={cn("text-2xl font-bold", getGapScoreColor(gap.gapScore))}>
                        {gap.gapScore.toFixed(1)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <TrendingUp className="h-4 w-4" />
                          <span>Search Volume</span>
                        </div>
                        <span className="font-medium">{gap.searchVolume.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Video className="h-4 w-4" />
                          <span>Existing Videos</span>
                        </div>
                        <span className="font-medium">{gap.videoCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Avg Video Age</span>
                        </div>
                        <span className="font-medium">
                          {gap.avgVideoAge < 30
                            ? `${gap.avgVideoAge} days`
                            : gap.avgVideoAge < 365
                            ? `${Math.floor(gap.avgVideoAge / 30)} months`
                            : `${Math.floor(gap.avgVideoAge / 365)} years`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Eye className="h-4 w-4" />
                          <span>Top Video Views</span>
                        </div>
                        <span className="font-medium">
                          {parseInt(gap.topVideoViews || "0", 10).toLocaleString()}
                        </span>
                      </div>
                      {gap.trendScore > 0 && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            <span>Trending: +{gap.trendScore.toFixed(1)}% momentum</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
