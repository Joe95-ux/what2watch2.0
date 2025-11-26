"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { YouTubeChannelList } from "@/hooks/use-youtube-channel-lists";
import { cn } from "@/lib/utils";

interface ChannelListCardProps {
  list: YouTubeChannelList;
  className?: string;
}

export function ChannelListCard({ list, className }: ChannelListCardProps) {
  const router = useRouter();
  const ownerName = list.user?.displayName || list.user?.username || "Unknown curator";
  // Get first few channels for avatar stack (need at least 3-4 for the effect)
  const channelAvatars = list.items.slice(0, 4);

  return (
    <button
      onClick={() => router.push(`/youtube-channel/lists/${list.id}`)}
      className={cn(
        "group flex flex-col gap-3 rounded-lg border border-border bg-card/70 p-4 text-left transition-all hover:border-primary/60 hover:shadow-md cursor-pointer",
        className
      )}
    >
      {/* Stacked Channel Avatars */}
      <div className="relative h-12 flex items-center">
        {channelAvatars.length > 0 ? (
          <>
            {channelAvatars.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "relative rounded-full border-2 border-background overflow-hidden bg-muted flex-shrink-0",
                  "h-10 w-10",
                  index > 0 && "-ml-5"
                )}
                style={{ zIndex: channelAvatars.length - index }}
              >
                {item.channelThumbnail ? (
                  <Image
                    src={item.channelThumbnail}
                    alt={item.channelTitle ?? "Channel"}
                    fill
                    className="object-cover"
                    sizes="40px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {item.channelTitle?.slice(0, 2).toUpperCase() ?? "YT"}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {/* Blur effect to indicate more channels */}
            {list.items.length > channelAvatars.length && (
              <div
                className={cn(
                  "relative rounded-full border-2 border-background overflow-hidden bg-muted/60 flex-shrink-0",
                  "h-10 w-10 -ml-5 flex items-center justify-center",
                  "backdrop-blur-md"
                )}
                style={{ zIndex: 0 }}
              >
                <span className="text-xs font-semibold text-muted-foreground">
                  +{list.items.length - channelAvatars.length}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No channels</span>
          </div>
        )}
      </div>

      {/* List Title */}
      <h3 className="text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">
        {list.name}
      </h3>

      {/* Creator */}
      <p className="text-sm text-muted-foreground">
        By {ownerName}
      </p>

      {/* Description */}
      {list.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {list.description}
        </p>
      )}
    </button>
  );
}

