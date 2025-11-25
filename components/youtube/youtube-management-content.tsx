"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Youtube, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { YouTubeChannelExtractorInline } from "@/components/youtube/youtube-channel-extractor-inline";
import { YouTubeChannelCard } from "@/components/youtube/youtube-channel-card";
import { YouTubeChannelCardSkeleton } from "@/components/youtube/youtube-channel-card-skeleton";
import { Button } from "@/components/ui/button";

interface Channel {
  id: string;
  channelId: string;
  slug?: string | null;
  title: string | null;
  thumbnail: string | null;
  channelUrl: string | null;
  isActive: boolean;
  isPrivate: boolean;
  addedByUserId: string | null;
  canManage?: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface ChannelsResponse {
  channels: Channel[];
  total: number;
}

const fetchChannels = async (): Promise<ChannelsResponse> => {
  const response = await fetch("/api/youtube/channels/manage");
  if (!response.ok) {
    throw new Error("Failed to fetch channels");
  }
  return response.json();
};

const ITEMS_PER_PAGE = 12;

export default function YouTubeManagementContent() {
  const [activePage, setActivePage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery<ChannelsResponse>({
    queryKey: ["youtube-channels-manage"],
    queryFn: fetchChannels,
  });

  const channels = useMemo(() => data?.channels || [], [data?.channels]);
  const activeChannels = useMemo(() => channels.filter((ch) => ch.isActive), [channels]);
  const inactiveChannels = useMemo(() => channels.filter((ch) => !ch.isActive), [channels]);

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

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Youtube className="h-8 w-8" />
          <h1 className="text-3xl font-bold tracking-tight">YouTube Channel Management</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your YouTube channels. Add new channels, control visibility, and set privacy settings.
        </p>
      </div>

      {/* Channel Extractor */}
      <div className="mb-8">
        <YouTubeChannelExtractorInline onChannelAdded={() => refetch()} />
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
                  <YouTubeChannelCard key={channel.id} channel={channel} />
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
                  <YouTubeChannelCard key={channel.id} channel={channel} />
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

          {channels.length === 0 && (
            <div className="text-center py-12 border rounded-lg">
              <Youtube className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No channels added yet. Use the form above to add your first channel.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

