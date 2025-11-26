"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Share2, Pencil, Trash2, ArrowLeftCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteYouTubeChannelList,
  useToggleYouTubeChannelListFollow,
  useYouTubeChannelList,
  YouTubeChannelList,
  YouTubeChannelListItem,
} from "@/hooks/use-youtube-channel-lists";
import { useYouTubeChannels } from "@/hooks/use-youtube-channels";
import { ChannelListBuilder } from "./channel-list-builder";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { YouTubeChannelCardPage, YouTubeChannelCardPageSkeleton } from "../youtube-channel-card-page";

interface ChannelListDetailProps {
  listId: string;
}

interface ChannelData {
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
  subscriberCount: string;
  videoCount: string;
}

// Component to fetch and display channels with categories and ratings
function ChannelListChannelsGrid({ items }: { items: YouTubeChannelListItem[] }) {
  const channelIds = items.map((item) => item.channelId);

  // Fetch channel data with categories and ratings
  const { data: channelsData, isLoading } = useQuery<{ channels: ChannelData[] }>({
    queryKey: ["channel-list-channels", channelIds.join(",")],
    queryFn: async () => {
      if (channelIds.length === 0) return { channels: [] };

      // Fetch channels data using the all channels endpoint
      const params = new URLSearchParams({
        page: "1",
        limit: "100", // Should be enough for most lists
      });
      // We'll filter by channel IDs on the client side since the API doesn't support filtering by specific IDs
      const response = await fetch(`/api/youtube/channels/all?${params}`);
      if (!response.ok) throw new Error("Failed to fetch channels");
      const data = await response.json() as {
        channels: Array<{
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
        }>;
      };

      // Filter to only channels in this list and map to the expected format
      const channelMap = new Map(
        items.map((item) => [item.channelId, item])
      );

      const channels: ChannelData[] = (data.channels || [])
        .filter((ch) => channelMap.has(ch.channelId))
        .map((ch) => ({
          id: channelMap.get(ch.channelId)?.id || ch.id,
          channelId: ch.channelId,
          slug: ch.slug || null,
          title: ch.title || channelMap.get(ch.channelId)?.channelTitle || null,
          thumbnail: ch.thumbnail || channelMap.get(ch.channelId)?.channelThumbnail || null,
          channelUrl: ch.channelUrl || channelMap.get(ch.channelId)?.channelUrl || null,
          categories: ch.categories || [],
          rating: ch.rating || null,
          subscriberCount: ch.subscriberCount || channelMap.get(ch.channelId)?.subscriberCount || "0",
          videoCount: ch.videoCount || channelMap.get(ch.channelId)?.videoCount || "0",
        }));

      // For channels not found in the API response, use the list item data
      const foundChannelIds = new Set(channels.map((ch) => ch.channelId));
      items.forEach((item) => {
        if (!foundChannelIds.has(item.channelId)) {
          channels.push({
            id: item.id,
            channelId: item.channelId,
            slug: null,
            title: item.channelTitle,
            thumbnail: item.channelThumbnail,
            channelUrl: item.channelUrl,
            categories: [],
            rating: null,
            subscriberCount: item.subscriberCount || "0",
            videoCount: item.videoCount || "0",
          });
        }
      });

      return { channels };
    },
    enabled: channelIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((_, index) => (
          <YouTubeChannelCardPageSkeleton key={index} />
        ))}
      </div>
    );
  }

  const channels = channelsData?.channels || [];

  if (channels.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="text-muted-foreground">No channels in this list.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {channels.map((channel: ChannelData) => (
        <YouTubeChannelCardPage key={channel.id} channel={channel} />
      ))}
    </div>
  );
}

export function ChannelListDetail({ listId }: ChannelListDetailProps) {
  const router = useRouter();
  const [builderOpen, setBuilderOpen] = useState(false);
  const { data: list, isLoading, refetch } = useYouTubeChannelList(listId);
  const { data: availableChannels = [] } = useYouTubeChannels();
  const deleteList = useDeleteYouTubeChannelList();
  const toggleFollow = useToggleYouTubeChannelListFollow();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-10 w-1/2 rounded-full" />
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Channel list not found</h1>
        <p className="text-muted-foreground">It may have been removed or set to private.</p>
        <Button onClick={() => router.push("/youtube-channel/lists")} className="mt-6 cursor-pointer">
          Back to lists
        </Button>
      </div>
    );
  }

  const handleFollowToggle = async () => {
    try {
      await toggleFollow.mutateAsync(list.id);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update follow. Please try again later.");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this channel list? This cannot be undone.")) return;
    try {
      await deleteList.mutateAsync(list.id);
      toast.success("List deleted");
      router.push("/youtube-channel/lists");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete list. Please try again.");
    }
  };

  const ownerName = list.user?.displayName || list.user?.username || "Curator";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <button
        onClick={() => router.push("/youtube-channel/lists")}
        className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeftCircle className="h-4 w-4" />
        Back to lists
      </button>

      <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="relative h-56 w-full overflow-hidden rounded-3xl bg-muted lg:w-2/5">
            {list.coverImage ? (
              <Image
                src={list.coverImage}
                alt={list.name}
                fill
                className="object-cover"
                sizes="400px"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No cover image
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
                Channel list
              </p>
              <h1 className="text-3xl font-bold">{list.name}</h1>
              <p className="text-muted-foreground">{list.description}</p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>Curated by {ownerName}</span>
              <span>•</span>
              <span>{list._count.items} channels</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" />
                {list.followersCount} followers
              </span>
            </div>

            {list.tags?.length ? (
              <div className="flex flex-wrap gap-2">
                {list.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="rounded-full">
                    #{tag}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {list.viewerState.isOwner ? (
                <>
                  <Button
                    variant="secondary"
                    className="gap-2 cursor-pointer"
                    onClick={() => setBuilderOpen(true)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit list
                  </Button>
                  <Button variant="outline" className="gap-2 cursor-pointer" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </>
              ) : (
                <Button
                  className="gap-2 cursor-pointer"
                  variant={list.viewerState.isFollowing ? "secondary" : "default"}
                  onClick={handleFollowToggle}
                  disabled={toggleFollow.isPending}
                >
                  <Users className="h-4 w-4" />
                  {list.viewerState.isFollowing ? "Following" : "Follow list"}
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-2 cursor-pointer"
                onClick={async () => {
                  if (navigator.share) {
                    await navigator.share({
                      title: list.name,
                      text: list.description ?? undefined,
                      url: window.location.href,
                    });
                  } else {
                    await navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied");
                  }
                }}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ChannelListChannelsGrid items={list.items} />

      <ChannelListBuilder
        isOpen={builderOpen}
        onClose={() => setBuilderOpen(false)}
        initialData={list as YouTubeChannelList}
        availableChannels={availableChannels}
        onCompleted={() => {
          setBuilderOpen(false);
          refetch();
        }}
      />
    </div>
  );
}

