"use client";

import { useQuery } from "@tanstack/react-query";
import { Youtube } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { YouTubeChannelExtractorInline } from "@/components/youtube/youtube-channel-extractor-inline";
import { YouTubeChannelCard } from "@/components/youtube/youtube-channel-card";
import { Button } from "@/components/ui/button";

interface Channel {
  id: string;
  channelId: string;
  title: string | null;
  thumbnail: string | null;
  channelUrl: string | null;
  isActive: boolean;
  isPrivate: boolean;
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
  const response = await fetch("/api/youtube/channels/manage");
  if (!response.ok) {
    throw new Error("Failed to fetch channels");
  }
  return response.json();
};

export default function YouTubeManagementContent() {
  const { data, isLoading, isError, refetch } = useQuery<ChannelsResponse>({
    queryKey: ["youtube-channels-manage"],
    queryFn: fetchChannels,
  });

  const channels = data?.channels || [];
  const activeChannels = channels.filter((ch) => ch.isActive);
  const inactiveChannels = channels.filter((ch) => !ch.isActive);

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
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
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
              <h2 className="text-xl font-semibold mb-4">Active Channels ({activeChannels.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeChannels.map((channel) => (
                  <YouTubeChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
            </div>
          )}

          {inactiveChannels.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Inactive Channels ({inactiveChannels.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveChannels.map((channel) => (
                  <YouTubeChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
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

