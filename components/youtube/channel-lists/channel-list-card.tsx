"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { YouTubeChannelList } from "@/hooks/use-youtube-channel-lists";
import { cn } from "@/lib/utils";

interface ChannelListCardProps {
  list: YouTubeChannelList;
  className?: string;
}

export function ChannelListCard({ list, className }: ChannelListCardProps) {
  const router = useRouter();
  const ownerName = list.user?.displayName || list.user?.username || "Unknown curator";
  const channelPreviews = list.items.slice(0, 4);

  return (
    <button
      onClick={() => router.push(`/youtube-channel/lists/${list.id}`)}
      className={cn(
        "group flex flex-col gap-3 rounded-3xl border border-border bg-card/70 p-4 text-left transition-all hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg cursor-pointer",
        className
      )}
    >
      <div className="relative w-full overflow-hidden rounded-2xl bg-muted aspect-[4/3]">
        {list.coverImage ? (
          <Image
            src={list.coverImage}
            alt={list.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        ) : channelPreviews.length ? (
          <div className="absolute inset-0 grid grid-cols-2 gap-1 bg-muted">
            {channelPreviews.map((item) => (
              <div key={item.id} className="relative">
                {item.channelThumbnail ? (
                  <Image
                    src={item.channelThumbnail}
                    alt={item.channelTitle ?? "Channel thumbnail"}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {item.channelTitle?.slice(0, 2) ?? "YT"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted/60">
            <span className="text-sm text-muted-foreground">No artwork yet</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold line-clamp-1">{list.name}</h3>
          <span className="text-xs font-medium text-muted-foreground">
            {list._count?.items ?? list.items.length} channels
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {list.description || "Curated YouTube channels"}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>By {ownerName}</span>
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          <Users className="h-3.5 w-3.5" />
          {list.followersCount}
        </span>
      </div>

      {list.tags?.length ? (
        <div className="flex flex-wrap gap-2">
          {list.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
          {list.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">+{list.tags.length - 3}</span>
          )}
        </div>
      ) : null}
    </button>
  );
}

