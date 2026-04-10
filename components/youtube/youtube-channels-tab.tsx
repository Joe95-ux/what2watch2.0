"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { YouTubeChannelCardPage, YouTubeChannelCardPageSkeleton } from "./youtube-channel-card-page";
import { YouTubeChannelCardHorizontal, YouTubeChannelCardHorizontalSkeleton } from "./youtube-channel-card-horizontal";
import { useYouTubeCardStyle } from "@/hooks/use-youtube-card-style";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Channel {
  id: string;
  channelId: string;
  slug?: string | null;
  title: string | null;
  thumbnail: string | null;
  channelUrl: string | null;
  categories: string[];
  rating: {
    average: number;
    count: number;
  } | null;
  subscriberCount?: string;
  videoCount?: string;
  inUserPool?: boolean;
}

export function YouTubeChannelsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [poolFilter, setPoolFilter] = useState<"all" | "inMyFeed" | "notInMyFeed">("all");
  const { data: cardStyle } = useYouTubeCardStyle();
  const effectiveCardStyle = cardStyle || "centered";

  const updateCardStyle = useMutation({
    mutationFn: async (nextStyle: "centered" | "horizontal") => {
      const response = await fetch("/api/user/view-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeCardStyle: nextStyle }),
      });

      if (!response.ok) {
        throw new Error("Failed to update card style");
      }
      return nextStyle;
    },
    onMutate: async (nextStyle) => {
      await queryClient.cancelQueries({ queryKey: ["youtube-card-style"] });
      const previousStyle = queryClient.getQueryData<"centered" | "horizontal">([
        "youtube-card-style",
      ]);
      queryClient.setQueryData(["youtube-card-style"], nextStyle);
      return { previousStyle };
    },
    onError: (_error, _nextStyle, context) => {
      if (context?.previousStyle) {
        queryClient.setQueryData(["youtube-card-style"], context.previousStyle);
      }
      toast.error("Failed to update card style");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["youtube-card-style"] });
    },
  });

  const { data, isLoading } = useQuery<{
    channels: Channel[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    availableCategories: string[];
  }>({
    queryKey: ["youtube-channels-all", page, categoryFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "32",
      });
      if (categoryFilter !== "all") {
        params.append("category", categoryFilter);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      const response = await fetch(`/api/youtube/channels/all?${params}`);
      if (!response.ok) throw new Error("Failed to fetch channels");
      return response.json();
    },
  });

  // Filter channels by pool filter
  let channels = data?.channels ?? [];
  if (poolFilter === "inMyFeed") {
    channels = channels.filter((c) => c.inUserPool === true);
  } else if (poolFilter === "notInMyFeed") {
    channels = channels.filter((c) => c.inUserPool !== true);
  }
  const pagination = data?.pagination;
  const availableCategories = data?.availableCategories ?? [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-10 h-10"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <div
          className="flex items-center gap-1 border border-border rounded-md p-1 bg-background h-10 shrink-0"
          role="group"
          aria-label="YouTube channel card layout"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => updateCardStyle.mutate("centered")}
            disabled={updateCardStyle.isPending}
            title="Centered cards"
            aria-label="Centered cards"
            aria-pressed={effectiveCardStyle === "centered"}
            className={cn(
              "h-8 cursor-pointer has-[>svg]:px-2",
              effectiveCardStyle === "centered" ? "bg-muted text-foreground" : "hover:bg-muted/50"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => updateCardStyle.mutate("horizontal")}
            disabled={updateCardStyle.isPending}
            title="Horizontal cards"
            aria-label="Horizontal cards"
            aria-pressed={effectiveCardStyle === "horizontal"}
            className={cn(
              "h-8 cursor-pointer has-[>svg]:px-2",
              effectiveCardStyle === "horizontal" ? "bg-muted text-foreground" : "hover:bg-muted/50"
            )}
          >
            <Rows3 className="h-4 w-4" />
          </Button>
        </div>
        <Select value={poolFilter} onValueChange={(value) => {
          setPoolFilter(value as typeof poolFilter);
          setPage(1);
        }}>
          <SelectTrigger className="w-[170px] sm:w-[180px] cursor-pointer shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">All Channels</SelectItem>
            <SelectItem value="inMyFeed" className="cursor-pointer">In My Feed</SelectItem>
            <SelectItem value="notInMyFeed" className="cursor-pointer">Not In My Feed</SelectItem>
          </SelectContent>
        </Select>
        {availableCategories.length > 0 && (
          <Select value={categoryFilter} onValueChange={(value) => {
            setCategoryFilter(value);
            setPage(1);
          }}>
            <SelectTrigger className="w-[190px] sm:w-[200px] cursor-pointer shrink-0">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                <SelectItem value="all" className="cursor-pointer">All categories</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category} className="cursor-pointer">
                    {category}
                  </SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
        )}
        </div>
      </div>

      {/* Channels Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 32 }).map((_, index) => 
            effectiveCardStyle === "horizontal" ? (
              <YouTubeChannelCardHorizontalSkeleton key={index} />
            ) : (
              <YouTubeChannelCardPageSkeleton key={index} />
            )
          )}
        </div>
      ) : channels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">No channels found.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {channels.map((channel) => 
              effectiveCardStyle === "horizontal" ? (
                <YouTubeChannelCardHorizontal key={channel.id} channel={channel} />
              ) : (
                <YouTubeChannelCardPage key={channel.id} channel={channel} />
              )
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((pageNum) => {
                    return (
                      pageNum === 1 ||
                      pageNum === pagination.totalPages ||
                      (pageNum >= page - 1 && pageNum <= page + 1)
                    );
                  })
                  .map((pageNum, index, array) => {
                    const showEllipsisBefore = index > 0 && array[index - 1] < pageNum - 1;
                    return (
                      <div key={pageNum} className="flex items-center gap-1">
                        {showEllipsisBefore && (
                          <span className="text-muted-foreground px-2">...</span>
                        )}
                        <Button
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="min-w-[2.5rem] cursor-pointer"
                        >
                          {pageNum}
                        </Button>
                      </div>
                    );
                  })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

