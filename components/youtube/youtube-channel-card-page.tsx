"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Users, Video } from "lucide-react";
import { getChannelProfilePath } from "@/lib/channel-path";
import { cn } from "@/lib/utils";

interface YouTubeChannelCardPageProps {
  channel: {
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
  };
}

export function YouTubeChannelCardPage({ channel }: YouTubeChannelCardPageProps) {
  const router = useRouter();
  const displayTitle = channel.title || "Channel";

  const handleClick = () => {
    router.push(getChannelProfilePath(channel.channelId, channel.slug));
  };

  return (
    <button
      onClick={handleClick}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card/70 p-4 text-left transition-all hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg cursor-pointer"
    >
      <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted flex-shrink-0 mx-auto">
        {channel.thumbnail ? (
          <Image
            src={channel.thumbnail}
            alt={displayTitle}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <span className="text-xs font-semibold text-muted-foreground">
              {displayTitle.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2 text-center">
        <h3 className="text-base font-semibold line-clamp-2 min-h-[2.5rem]">{displayTitle}</h3>

        {channel.rating && (
          <div className="flex items-center justify-center gap-1.5">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span className="text-sm font-medium">{channel.rating.average}</span>
            <span className="text-xs text-muted-foreground">({channel.rating.count})</span>
          </div>
        )}

        {channel.categories.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {channel.categories.slice(0, 2).map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="text-xs font-medium bg-muted/70 hover:bg-muted"
              >
                {category}
              </Badge>
            ))}
            {channel.categories.length > 2 && (
              <span className="text-xs text-muted-foreground">+{channel.categories.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

export function YouTubeChannelCardPageSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/70 p-4">
      <Skeleton className="h-20 w-20 rounded-full mx-auto" />
      <div className="space-y-2 text-center">
        <Skeleton className="h-6 w-full max-w-[120px] mx-auto" />
        <Skeleton className="h-4 w-16 mx-auto" />
        <div className="flex items-center justify-center gap-1.5">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
    </div>
  );
}

