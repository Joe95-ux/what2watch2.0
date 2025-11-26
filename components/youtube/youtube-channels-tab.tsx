"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { YouTubeChannelCardPage, YouTubeChannelCardPageSkeleton } from "./youtube-channel-card-page";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
}

export function YouTubeChannelsTab() {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
        limit: "30",
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

  const channels = data?.channels ?? [];
  const pagination = data?.pagination;
  const availableCategories = data?.availableCategories ?? [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
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
            className="pl-10"
          />
        </div>
        {availableCategories.length > 0 && (
          <Select value={categoryFilter} onValueChange={(value) => {
            setCategoryFilter(value);
            setPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {availableCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Channels Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 30 }).map((_, index) => (
            <YouTubeChannelCardPageSkeleton key={index} />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">No channels found.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((channel) => (
              <YouTubeChannelCardPage key={channel.id} channel={channel} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

