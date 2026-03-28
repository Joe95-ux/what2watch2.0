"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Users, Video } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { type FavoriteChannel } from "@/hooks/use-favorite-channels";
import { getChannelProfilePath } from "@/lib/channel-path";

export function formatFavoriteChannelCount(count: string | number): string {
  const num = typeof count === "string" ? parseInt(count, 10) : count;
  if (isNaN(num)) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

async function fetchChannelStats(channelId: string) {
  const response = await fetch(`/api/youtube/channels/${channelId}`);
  if (!response.ok) {
    return { subscriberCount: "0", videoCount: "0" };
  }
  const data = await response.json();
  return {
    subscriberCount: data.channel?.subscriberCount || "0",
    videoCount: data.channel?.videoCount || "0",
  };
}

export function FavoriteChannelCard({ favorite }: { favorite: FavoriteChannel }) {
  const router = useRouter();
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["channel-stats", favorite.channelId],
    queryFn: () => fetchChannelStats(favorite.channelId),
    staleTime: 1000 * 60 * 15,
  });

  return (
    <button
      type="button"
      onClick={() => router.push(getChannelProfilePath(favorite.channelId, favorite.slug))}
      className="group w-full rounded-2xl border border-border/60 p-4 text-left transition-colors hover:border-primary cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 rounded-full overflow-hidden bg-muted flex-shrink-0">
          {favorite.thumbnail ? (
            <Image
              src={favorite.thumbnail}
              alt={favorite.title || "Channel"}
              fill
              className="object-cover"
              unoptimized
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm line-clamp-1 mb-1">{favorite.title || "Channel"}</p>
          {isLoadingStats ? (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-12" />
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{formatFavoriteChannelCount(stats?.subscriberCount || "0")}</span>
              </div>
              <div className="flex items-center gap-1">
                <Video className="h-3 w-3" />
                <span>{formatFavoriteChannelCount(stats?.videoCount || "0")}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
