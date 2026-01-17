"use client";

import { useState } from "react";
import { BarChart3, Search, Sparkles, TrendingUp, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { useYouTubeAnalyzer } from "@/hooks/use-youtube-analyzer";
import { cn } from "@/lib/utils";

export function YouTubeAnalyzerPageClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeKeyword, setActiveKeyword] = useState<string>("");

  const { data, isLoading, error } = useYouTubeAnalyzer(
    activeKeyword,
    10,
    activeKeyword.trim().length > 0
  );
  const analysis = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Title & Thumbnail Analyzer</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Analyze top-performing YouTube video titles and thumbnails. Discover patterns that drive views and engagement.
          </p>
        </div>

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Analyze Videos</CardTitle>
            <CardDescription>
              Enter a keyword to see how top-performing videos use titles and thumbnails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter a keyword (e.g., 'iPhone review', 'cooking tutorial')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery.trim()) {
                      setActiveKeyword(searchQuery.trim());
                    }
                  }}
                />
              </div>
              <Button
                onClick={() => {
                  if (searchQuery.trim()) {
                    setActiveKeyword(searchQuery.trim());
                  }
                }}
                disabled={!searchQuery.trim() || isLoading}
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
              <p className="text-destructive">Failed to analyze videos. Please try again later.</p>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
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
        ) : analysis && analysis.aggregateAnalysis ? (
          <Tabs defaultValue="titles" className="space-y-4">
            <TabsList>
              <TabsTrigger value="titles">Title Analysis</TabsTrigger>
              <TabsTrigger value="thumbnails">Thumbnail Analysis</TabsTrigger>
              <TabsTrigger value="videos">Top Videos</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
            </TabsList>

            <TabsContent value="titles" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Title Patterns</CardTitle>
                  <CardDescription>Common patterns in top-performing titles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Average Title Length</p>
                      <p className="text-2xl font-bold">{analysis.aggregateAnalysis.avgTitleLength} characters</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Common Patterns</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-sm">
                          {analysis.aggregateAnalysis.percentWithBrackets}% use brackets
                        </Badge>
                        <Badge variant="secondary" className="text-sm">
                          {analysis.aggregateAnalysis.percentWithNumbers}% use numbers
                        </Badge>
                        <Badge variant="secondary" className="text-sm">
                          {analysis.aggregateAnalysis.percentWithQuestions}% ask questions
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="thumbnails" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Thumbnail Analysis</CardTitle>
                  <CardDescription>AI-powered analysis of thumbnail characteristics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-medium mb-4">Thumbnail Features</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Videos with Faces</p>
                          <p className="text-2xl font-bold">
                            {Math.round(
                              (analysis.videos.filter((v) => v.analysis?.hasFace).length /
                                analysis.videos.length) *
                                100
                            )}
                            %
                          </p>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Videos with Text</p>
                          <p className="text-2xl font-bold">
                            {Math.round(
                              (analysis.videos.filter((v) => v.analysis?.hasText).length /
                                analysis.videos.length) *
                                100
                            )}
                            %
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-4">Most Common Colors</p>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const colorFreq: Record<string, number> = {};
                          analysis.videos.forEach((v) => {
                            v.analysis?.dominantColors?.forEach((color) => {
                              colorFreq[color] = (colorFreq[color] || 0) + 1;
                            });
                          });
                          return Object.entries(colorFreq)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 8)
                            .map(([color, count]) => (
                              <Badge
                                key={color}
                                variant="secondary"
                                className="text-sm capitalize"
                              >
                                {color} ({count})
                              </Badge>
                            ));
                        })()}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-4">Average Brightness</p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{
                                width: `${
                                  (analysis.videos
                                    .map((v) => v.analysis?.brightness || 0)
                                    .reduce((a, b) => a + b, 0) /
                                    analysis.videos.length) || 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium">
                          {Math.round(
                            (analysis.videos
                              .map((v) => v.analysis?.brightness || 0)
                              .reduce((a, b) => a + b, 0) /
                              analysis.videos.length) || 0
                          )}
                          /100
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="videos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Videos</CardTitle>
                  <CardDescription>
                    Top {analysis.videos.length} videos for "{activeKeyword}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.videos.map((video) => (
                      <div
                        key={video.id}
                        className="flex gap-4 p-4 border rounded-lg hover:border-primary/50 transition-colors"
                      >
                        {video.thumbnail && (
                          <div className="relative w-32 h-20 flex-shrink-0 rounded overflow-hidden">
                            <Image
                              src={video.thumbnail}
                              alt={video.title}
                              fill
                              className="object-cover"
                              sizes="128px"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium line-clamp-2">{video.title}</h4>
                            <Link
                              href={`https://www.youtube.com/watch?v=${video.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0"
                            >
                              <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </Link>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{video.channelTitle}</p>
                          {video.analysis && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {video.analysis.hasBrackets && (
                                <Badge variant="outline" className="text-xs">Brackets</Badge>
                              )}
                              {video.analysis.hasNumber && (
                                <Badge variant="outline" className="text-xs">Number</Badge>
                              )}
                              {video.analysis.hasQuestion && (
                                <Badge variant="outline" className="text-xs">Question</Badge>
                              )}
                              {video.analysis.hasFace && (
                                <Badge variant="outline" className="text-xs">Face</Badge>
                              )}
                              {video.analysis.hasText && (
                                <Badge variant="outline" className="text-xs">Text</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {video.analysis.titleLength} chars
                              </Badge>
                            </div>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{parseInt(video.viewCount || "0", 10).toLocaleString()} views</span>
                            <span>{video.likeCount} likes</span>
                            <span>{video.commentCount} comments</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="patterns" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Title Patterns</CardTitle>
                    <CardDescription>What makes titles successful</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Title Length Distribution</p>
                        <p className="text-muted-foreground">
                          Average: {analysis.aggregateAnalysis.avgTitleLength} characters
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Most Common Words</p>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const wordFreq: Record<string, number> = {};
                            analysis.videos.forEach((v) => {
                              v.analysis?.topWords?.forEach((word) => {
                                wordFreq[word] = (wordFreq[word] || 0) + 1;
                              });
                            });
                            return Object.entries(wordFreq)
                              .sort(([, a], [, b]) => b - a)
                              .slice(0, 10)
                              .map(([word]) => (
                                <Badge key={word} variant="secondary" className="text-sm">
                                  {word}
                                </Badge>
                              ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Thumbnail Patterns</CardTitle>
                    <CardDescription>AI-analyzed thumbnail characteristics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Thumbnail Features</p>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const withFaces = analysis.videos.filter((v) => v.analysis?.hasFace).length;
                            const withText = analysis.videos.filter((v) => v.analysis?.hasText).length;
                            return (
                              <>
                                <Badge variant="secondary" className="text-sm">
                                  {Math.round((withFaces / analysis.videos.length) * 100)}% have faces
                                </Badge>
                                <Badge variant="secondary" className="text-sm">
                                  {Math.round((withText / analysis.videos.length) * 100)}% have text
                                </Badge>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Dominant Colors</p>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const colorFreq: Record<string, number> = {};
                            analysis.videos.forEach((v) => {
                              v.analysis?.dominantColors?.forEach((color) => {
                                colorFreq[color] = (colorFreq[color] || 0) + 1;
                              });
                            });
                            return Object.entries(colorFreq)
                              .sort(([, a], [, b]) => b - a)
                              .slice(0, 5)
                              .map(([color]) => (
                                <Badge key={color} variant="outline" className="text-sm capitalize">
                                  {color}
                                </Badge>
                              ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to analyze</h3>
              <p className="text-muted-foreground">
                Enter a keyword above to see how top-performing videos use titles and thumbnails.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
