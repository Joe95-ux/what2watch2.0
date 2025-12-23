"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Youtube, ChevronLeft, ChevronRight, Film } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { YouTubeChannelExtractorInline } from "@/components/youtube/youtube-channel-extractor-inline";
import { YouTubeChannelCard } from "@/components/youtube/youtube-channel-card";
import { YouTubeChannelCardSkeleton } from "@/components/youtube/youtube-channel-card-skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Channel {
  id: string;
  channelId: string;
  slug?: string | null;
  title: string | null;
  thumbnail: string | null;
  channelUrl: string | null;
  isActive: boolean;
  isPrivate: boolean;
  isNollywood: boolean;
  addedByUserId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface ChannelsResponse {
  channels: Channel[];
  total: number;
}

const fetchChannels = async (): Promise<ChannelsResponse> => {
  const response = await fetch("/api/admin/youtube/channels");
  if (!response.ok) {
    throw new Error("Failed to fetch channels");
  }
  return response.json();
};

const ITEMS_PER_PAGE = 12;

export default function AdminYouTubeManagementContent() {
  const [activePage, setActivePage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);
  const [filterNollywood, setFilterNollywood] = useState<"all" | "nollywood" | "notNollywood">("all");

  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<ChannelsResponse>({
    queryKey: ["admin-youtube-channels"],
    queryFn: fetchChannels,
  });

  const toggleNollywoodMutation = useMutation({
    mutationFn: async ({ channelId, isNollywood }: { channelId: string; isNollywood: boolean }) => {
      const response = await fetch(`/api/admin/youtube/channels/${channelId}/nollywood`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isNollywood }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update channel");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Channel updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-youtube-channels"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-channels"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-channels-manage"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update channel");
    },
  });

  const channels = useMemo(() => data?.channels || [], [data?.channels]);
  
  // Filter channels
  const filteredChannels = useMemo(() => {
    if (filterNollywood === "all") return channels;
    if (filterNollywood === "nollywood") return channels.filter((ch) => ch.isNollywood);
    return channels.filter((ch) => !ch.isNollywood);
  }, [channels, filterNollywood]);

  const activeChannels = useMemo(() => filteredChannels.filter((ch) => ch.isActive), [filteredChannels]);
  const inactiveChannels = useMemo(() => filteredChannels.filter((ch) => !ch.isActive), [filteredChannels]);

  // Pagination calculations for active channels
  const activeTotalPages = Math.ceil(activeChannels.length / ITEMS_PER_PAGE);
  const paginatedActiveChannels = useMemo(() => {
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    return activeChannels.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [activeChannels, activePage]);

  // Pagination calculations for inactive channels
  const inactiveTotalPages = Math.ceil(inactiveChannels.length / ITEMS_PER_PAGE);
  const paginatedInactiveChannels = useMemo(() => {
    const startIndex = (inactivePage - 1) * ITEMS_PER_PAGE;
    return inactiveChannels.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [inactiveChannels, inactivePage]);

  const handleToggleNollywood = (channelId: string, currentValue: boolean) => {
    toggleNollywoodMutation.mutate({ channelId, isNollywood: !currentValue });
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Admin YouTube Channel Management</h1>
        </div>
        <p className="text-muted-foreground">
          Manage all YouTube channels. Control which channels appear in the general pool and Nollywood collection.
        </p>
      </div>

      {/* Channel Extractor */}
      <div className="mb-8">
        <YouTubeChannelExtractorInline onChannelAdded={() => refetch()} />
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <Label className="text-sm font-medium">Filter:</Label>
        <div className="flex items-center gap-2">
          <Button
            variant={filterNollywood === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterNollywood("all")}
          >
            All ({channels.length})
          </Button>
          <Button
            variant={filterNollywood === "nollywood" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterNollywood("nollywood")}
            className="gap-2"
          >
            <Film className="h-4 w-4" />
            Nollywood ({channels.filter((ch) => ch.isNollywood).length})
          </Button>
          <Button
            variant={filterNollywood === "notNollywood" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterNollywood("notNollywood")}
          >
            Not Nollywood ({channels.filter((ch) => !ch.isNollywood).length})
          </Button>
        </div>
      </div>

      {/* Active Channels */}
      {isLoading ? (
        <div className="mb-8">
          <Skeleton className="h-7 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <YouTubeChannelCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load channels</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      ) : (
        <>
          {activeChannels.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  Active Channels ({activeChannels.length})
                </h2>
                {activeTotalPages > 1 && (
                  <span className="text-sm text-muted-foreground">
                    Page {activePage} of {activeTotalPages}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedActiveChannels.map((channel) => (
                  <div key={channel.id} className="relative">
                    <YouTubeChannelCard channel={channel} />
                    <div className="mt-2 p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`nollywood-${channel.id}`} className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                          <Film className="h-4 w-4" />
                          Nollywood Collection
                        </Label>
                        <Switch
                          id={`nollywood-${channel.id}`}
                          checked={channel.isNollywood}
                          onCheckedChange={() => handleToggleNollywood(channel.channelId, channel.isNollywood)}
                          disabled={toggleNollywoodMutation.isPending}
                        />
                      </div>
                      {channel.isNollywood && (
                        <Badge variant="default" className="mt-2">
                          <Film className="h-3 w-3 mr-1" />
                          In Nollywood
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Active Channels Pagination */}
              {activeTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActivePage((prev) => Math.max(1, prev - 1))}
                    disabled={activePage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: activeTotalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === activeTotalPages ||
                          (page >= activePage - 1 && page <= activePage + 1)
                        );
                      })
                      .map((page, index, array) => {
                        const showEllipsisBefore = index > 0 && array[index - 1] < page - 1;
                        return (
                          <div key={page} className="flex items-center gap-1">
                            {showEllipsisBefore && (
                              <span className="text-muted-foreground px-2">...</span>
                            )}
                            <Button
                              variant={activePage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setActivePage(page)}
                              className="min-w-[2.5rem]"
                            >
                              {page}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActivePage((prev) => Math.min(activeTotalPages, prev + 1))}
                    disabled={activePage === activeTotalPages}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {inactiveChannels.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  Inactive Channels ({inactiveChannels.length})
                </h2>
                {inactiveTotalPages > 1 && (
                  <span className="text-sm text-muted-foreground">
                    Page {inactivePage} of {inactiveTotalPages}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedInactiveChannels.map((channel) => (
                  <div key={channel.id} className="relative">
                    <YouTubeChannelCard channel={channel} />
                    <div className="mt-2 p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`nollywood-inactive-${channel.id}`} className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                          <Film className="h-4 w-4" />
                          Nollywood Collection
                        </Label>
                        <Switch
                          id={`nollywood-inactive-${channel.id}`}
                          checked={channel.isNollywood}
                          onCheckedChange={() => handleToggleNollywood(channel.channelId, channel.isNollywood)}
                          disabled={toggleNollywoodMutation.isPending}
                        />
                      </div>
                      {channel.isNollywood && (
                        <Badge variant="default" className="mt-2">
                          <Film className="h-3 w-3 mr-1" />
                          In Nollywood
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Inactive Channels Pagination */}
              {inactiveTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInactivePage((prev) => Math.max(1, prev - 1))}
                    disabled={inactivePage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: inactiveTotalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === inactiveTotalPages ||
                          (page >= inactivePage - 1 && page <= inactivePage + 1)
                        );
                      })
                      .map((page, index, array) => {
                        const showEllipsisBefore = index > 0 && array[index - 1] < page - 1;
                        return (
                          <div key={page} className="flex items-center gap-1">
                            {showEllipsisBefore && (
                              <span className="text-muted-foreground px-2">...</span>
                            )}
                            <Button
                              variant={inactivePage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setInactivePage(page)}
                              className="min-w-[2.5rem]"
                            >
                              {page}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInactivePage((prev) => Math.min(inactiveTotalPages, prev + 1))}
                    disabled={inactivePage === inactiveTotalPages}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {filteredChannels.length === 0 && (
            <div className="text-center py-12 border rounded-lg">
              <Youtube className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {filterNollywood === "all"
                  ? "No channels added yet. Use the form above to add your first channel."
                  : filterNollywood === "nollywood"
                  ? "No Nollywood channels found."
                  : "No non-Nollywood channels found."}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

