"use client";

import { useState } from "react";
import { MessageSquare, Search, TrendingUp, HelpCircle, Sparkles, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExtractQuestions, useQuestionTrends, useAggregateQuestions } from "@/hooks/use-comment-questions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  how: "How",
  what: "What",
  why: "Why",
  when: "When",
  where: "Where",
  who: "Who",
  general: "General",
};

const QUESTION_TYPE_COLORS: Record<string, string> = {
  how: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  what: "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
  why: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  when: "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30",
  where: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
  who: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
  general: "bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30",
};

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

export function CommentQuestionsPageClient() {
  const [videoId, setVideoId] = useState("");
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [minFrequency, setMinFrequency] = useState(2);

  const { data: questionsData, isLoading: questionsLoading, error: questionsError } = useExtractQuestions(
    activeVideoId,
    100,
    !!activeVideoId
  );

  const { data: trendsData, isLoading: trendsLoading } = useQuestionTrends(category, 30, minFrequency);
  const aggregateMutation = useAggregateQuestions();

  const handleExtract = () => {
    if (videoId.trim()) {
      // Extract video ID from URL if needed
      let extractedId = videoId.trim();
      
      // Handle YouTube URL formats
      if (extractedId.includes("youtube.com") || extractedId.includes("youtu.be")) {
        const urlMatch = extractedId.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (urlMatch) {
          extractedId = urlMatch[1];
        } else {
          toast.error("Invalid YouTube URL");
          return;
        }
      }
      
      setActiveVideoId(extractedId);
    }
  };

  const handleAggregate = async () => {
    try {
      const result = await aggregateMutation.mutateAsync();
      toast.success(`Aggregated questions: ${result.trendsCreated} new trends, ${result.trendsUpdated} updated`);
    } catch (error: any) {
      toast.error(error.message || "Failed to aggregate questions");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Comment Question Mining</h1>
          <p className="text-muted-foreground text-lg">
            Extract questions from video comments to discover what viewers want to know and identify content opportunities.
          </p>
        </div>

        <Tabs defaultValue="extract" className="space-y-4">
          <TabsList>
            <TabsTrigger value="extract" className="cursor-pointer">Extract Questions</TabsTrigger>
            <TabsTrigger value="trends" className="cursor-pointer">Question Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="extract" className="space-y-4">
            {/* Extract Section */}
            <Card>
              <CardHeader>
                <CardTitle>Extract Questions from Video</CardTitle>
                <CardDescription>
                  Enter a YouTube video ID or URL to extract questions from comments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Video ID or YouTube URL (e.g., dQw4w9WgXcQ or https://youtube.com/watch?v=...)"
                      value={videoId}
                      onChange={(e) => setVideoId(e.target.value)}
                      className="pl-10"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && videoId.trim() && !questionsLoading) {
                          handleExtract();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleExtract}
                    disabled={!videoId.trim() || questionsLoading}
                    className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white"
                  >
                    {questionsLoading ? "Extracting..." : "Extract"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {questionsError && (
              <Card className="border-destructive">
                <CardContent className="py-12 text-center">
                  <p className="text-destructive">
                    {questionsError instanceof Error ? questionsError.message : "Failed to extract questions"}
                  </p>
                </CardContent>
              </Card>
            )}

            {questionsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : questionsData && questionsData.questions.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Found {questionsData.total} Question{questionsData.total !== 1 ? "s" : ""}
                  </CardTitle>
                  <CardDescription>
                    Questions extracted from video comments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {questionsData.questions.map((question) => (
                      <Card key={question.id} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-sm font-medium mb-2">{question.question}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {question.questionType && (
                                  <Badge
                                    className={cn(
                                      "text-xs",
                                      QUESTION_TYPE_COLORS[question.questionType] || QUESTION_TYPE_COLORS.general
                                    )}
                                  >
                                    {QUESTION_TYPE_LABELS[question.questionType] || question.questionType}
                                  </Badge>
                                )}
                                <span>{question.upvotes} upvotes</span>
                                {question.replies > 0 && <span>{question.replies} replies</span>}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : questionsData ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No questions found in comments for this video.</p>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Question Trends</CardTitle>
                <CardDescription>
                  Aggregated questions across multiple videos to identify common content opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <Select value={category || ""} onValueChange={(value) => setCategory(value || undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All categories</SelectItem>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Min Frequency</label>
                    <Input
                      type="number"
                      min="1"
                      value={minFrequency}
                      onChange={(e) => setMinFrequency(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleAggregate}
                      disabled={aggregateMutation.isPending}
                      className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white"
                    >
                      {aggregateMutation.isPending ? "Aggregating..." : "Aggregate Questions"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trends List */}
            {trendsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : trendsData && trendsData.trends.length > 0 ? (
              <div className="space-y-4">
                {trendsData.trends.map((trend) => (
                  <Card key={trend.id} className="hover:border-primary/50 transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{trend.question}</CardTitle>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              Asked {trend.frequency} time{trend.frequency !== 1 ? "s" : ""}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {trend.videos.length} video{trend.videos.length !== 1 ? "s" : ""}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {trend.avgUpvotes.toFixed(1)} avg upvotes
                            </Badge>
                            {trend.category && (
                              <Badge className="text-xs">
                                {CATEGORIES.find((c) => c.value === trend.category)?.label || trend.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-primary/10 text-primary border-primary/30">
                          Score: {trend.trendScore.toFixed(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        First seen: {new Date(trend.firstSeen).toLocaleDateString()} • 
                        Last seen: {new Date(trend.lastSeen).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No question trends found</h3>
                  <p className="text-muted-foreground mb-4">
                    Extract questions from videos first, then aggregate them to see trends.
                  </p>
                  <Button
                    onClick={handleAggregate}
                    disabled={aggregateMutation.isPending}
                    className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white"
                  >
                    {aggregateMutation.isPending ? "Aggregating..." : "Aggregate Questions"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
