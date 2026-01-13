"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Share2, Pencil, Trash2, ArrowLeftCircle, Users, Facebook, Twitter, MessageCircle, Mail, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import { YouTubeChannelCardPage, YouTubeChannelCardPageSkeleton } from "../youtube-channel-card-page";
import { YouTubeChannelCardHorizontal, YouTubeChannelCardHorizontalSkeleton } from "../youtube-channel-card-horizontal";
import { useYouTubeCardStyle } from "@/hooks/use-youtube-card-style";

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
  note?: string | null;
  inUserPool?: boolean;
}

// Component to fetch and display channels with categories and ratings
function ChannelListChannelsGrid({ items, listId }: { items: YouTubeChannelListItem[]; listId: string }) {
  const { data: cardStyle } = useYouTubeCardStyle();
  const effectiveCardStyle = cardStyle || "centered";
  const channelIds = items.map((item) => item.channelId);

  // Create a map of channelId to position to preserve order
  const positionMap = new Map(
    items.map((item) => [item.channelId, item.position])
  );

  // Fetch channel data with categories and ratings
  const { data: channelsData, isLoading } = useQuery<{ channels: ChannelData[] }>({
    queryKey: ["channel-list-channels", listId, channelIds.join(",")],
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
          inUserPool?: boolean;
        }>;
      };

      // Filter to only channels in this list and map to the expected format
      const channelMap = new Map(
        items.map((item) => [item.channelId, item])
      );

      const channels: ChannelData[] = (data.channels || [])
        .filter((ch) => channelMap.has(ch.channelId))
        .map((ch) => {
          const listItem = channelMap.get(ch.channelId);
          return {
            id: listItem?.id || ch.id,
            channelId: ch.channelId,
            slug: ch.slug || null,
            title: ch.title || listItem?.channelTitle || null,
            thumbnail: ch.thumbnail || listItem?.channelThumbnail || null,
            channelUrl: ch.channelUrl || listItem?.channelUrl || null,
            categories: ch.categories || [],
            rating: ch.rating || null,
            subscriberCount: ch.subscriberCount || listItem?.subscriberCount || "0",
            videoCount: ch.videoCount || listItem?.videoCount || "0",
            note: listItem?.notes || null,
            inUserPool: ch.inUserPool ?? false,
          };
        });

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
            note: item.notes || null,
            inUserPool: false, // Default to false for channels not in API response
          });
        }
      });

      // Sort channels by position to preserve order from the list
      channels.sort((a, b) => {
        const posA = positionMap.get(a.channelId) ?? Infinity;
        const posB = positionMap.get(b.channelId) ?? Infinity;
        return posA - posB;
      });

      return { channels };
    },
    enabled: channelIds.length > 0,
    staleTime: 0, // Always refetch when query key changes (e.g., when list is updated)
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((_, index) => 
          effectiveCardStyle === "horizontal" ? (
            <YouTubeChannelCardHorizontalSkeleton key={index} />
          ) : (
            <YouTubeChannelCardPageSkeleton key={index} />
          )
        )}
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
      {channels.map((channel: ChannelData) => 
        effectiveCardStyle === "horizontal" ? (
          <YouTubeChannelCardHorizontal key={channel.id} channel={channel} />
        ) : (
          <YouTubeChannelCardPage key={channel.id} channel={channel} />
        )
      )}
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
      <div className="mx-auto max-w-[90rem] px-4 py-10 space-y-8">
        {/* Back Button Skeleton */}
        <Skeleton className="h-5 w-32" />

        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-6 border-b">
          {/* List Details - Left */}
          <div className="flex-1 space-y-4">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-9 w-3/4 mb-3" />
              <Skeleton className="h-5 w-full max-w-md" />
            </div>

            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-1" />
              <Skeleton className="h-4 w-28" />
            </div>

            {/* Tags Skeleton */}
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </div>

          {/* Vertical Divider - Hidden on mobile */}
          <div className="hidden md:block w-px h-auto bg-border mx-4" />

          {/* Action Buttons - Right */}
          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>

        {/* Channels Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <YouTubeChannelCardPageSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="mx-auto max-w-[90rem] px-4 py-20 text-center">
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

  const ownerName = list.user?.username || list.user?.displayName || "Curator";
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleSocialShare = (platform: "facebook" | "twitter" | "whatsapp" | "email" | "link") => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(list.name);
    const encodedDescription = encodeURIComponent(list.description || "");

    if (platform === "link") {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
      return;
    }

    let shareUrl_platform = "";
    if (platform === "facebook") {
      shareUrl_platform = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    } else if (platform === "twitter") {
      shareUrl_platform = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}${encodedDescription ? ` - ${encodedDescription}` : ""}`;
    } else if (platform === "whatsapp") {
      shareUrl_platform = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
    } else if (platform === "email") {
      const subject = encodeURIComponent(list.name);
      const body = encodeURIComponent(`${list.description || ""}\n\n${shareUrl}`);
      shareUrl_platform = `mailto:?subject=${subject}&body=${body}`;
    }

    if (shareUrl_platform) {
      if (platform === "email") {
        window.location.href = shareUrl_platform;
      } else {
        window.open(shareUrl_platform, "_blank", "width=600,height=400");
      }
    }
  };

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-10 space-y-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeftCircle className="h-4 w-4" />
        Back
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-6 border-b">
        {/* List Details - Left */}
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
        </div>

        {/* Vertical Divider - Hidden on mobile */}
        <div className="hidden md:block w-px h-auto bg-border mx-4" />

        {/* Action Buttons - Right */}
        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
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
              className={cn(
                "gap-2 cursor-pointer",
                list.viewerState.isFollowing && "bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30 border-green-500/30"
              )}
              variant={list.viewerState.isFollowing ? "outline" : "default"}
              onClick={handleFollowToggle}
              disabled={toggleFollow.isPending}
            >
              <Users className="h-4 w-4" />
              {list.viewerState.isFollowing ? "Following" : "Follow list"}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 cursor-pointer">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => handleSocialShare("facebook")}
                className="cursor-pointer"
              >
                <Facebook className="h-4 w-4 mr-2" />
                Facebook
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSocialShare("twitter")}
                className="cursor-pointer"
              >
                <Twitter className="h-4 w-4 mr-2" />
                X (Twitter)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSocialShare("whatsapp")}
                className="cursor-pointer"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSocialShare("email")}
                className="cursor-pointer"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSocialShare("link")}
                className="cursor-pointer"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ChannelListChannelsGrid items={list.items} listId={list.id} />

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

