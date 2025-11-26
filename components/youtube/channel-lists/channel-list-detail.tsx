"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Users, Share2, Pencil, Trash2, ArrowLeftCircle, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteYouTubeChannelList,
  useToggleYouTubeChannelListFollow,
  useYouTubeChannelList,
  YouTubeChannelList,
} from "@/hooks/use-youtube-channel-lists";
import { useYouTubeChannels } from "@/hooks/use-youtube-channels";
import { ChannelListBuilder } from "./channel-list-builder";
import { toast } from "sonner";

interface ChannelListDetailProps {
  listId: string;
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
      toast({
        title: "Unable to update follow",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this channel list? This cannot be undone.")) return;
    try {
      await deleteList.mutateAsync(list.id);
      toast({ title: "List deleted" });
      router.push("/youtube-channel/lists");
    } catch (error) {
      toast({
        title: "Unable to delete list",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
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
                onClick={() => {
                  navigator.share
                    ? navigator.share({
                        title: list.name,
                        text: list.description ?? undefined,
                        url: window.location.href,
                      })
                    : navigator.clipboard
                        .writeText(window.location.href)
                        .then(() => toast({ title: "Link copied" }));
                }}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {list.items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-4 rounded-3xl border border-border bg-card/70 p-5 shadow-sm sm:flex-row"
          >
            <div className="relative h-32 w-full overflow-hidden rounded-2xl bg-muted sm:w-48">
              {item.channelThumbnail ? (
                <Image
                  src={item.channelThumbnail}
                  alt={item.channelTitle ?? "Channel"}
                  fill
                  className="object-cover"
                  sizes="200px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Youtube className="h-10 w-10" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{item.channelTitle}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.subscriberCount
                      ? `${item.subscriberCount} subscribers`
                      : "Subscriber data unavailable"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() =>
                    window.open(
                      item.channelUrl ?? `https://www.youtube.com/channel/${item.channelId}`,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  Visit channel
                </Button>
              </div>
              {item.channelDescription && (
                <p className="text-sm text-muted-foreground line-clamp-3">{item.channelDescription}</p>
              )}
              {item.notes && (
                <div className="rounded-2xl bg-muted/60 p-3 text-sm text-foreground">
                  <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                    Curator notes
                  </p>
                  {item.notes}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

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

