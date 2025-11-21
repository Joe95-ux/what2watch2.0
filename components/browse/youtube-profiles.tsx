"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { NOLLYWOOD_CHANNEL_IDS } from "@/lib/youtube-channels";

interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  customUrl: string;
  subscriberCount: string;
  videoCount: string;
  channelUrl: string;
}

interface YouTubeProfilesProps {
  className?: string;
}

export default function YouTubeProfiles({ className }: YouTubeProfilesProps) {
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      // Don't fetch if no channel IDs are configured
      if (!NOLLYWOOD_CHANNEL_IDS || NOLLYWOOD_CHANNEL_IDS.length === 0) {
        setIsLoading(false);
        setChannels([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/youtube/channels?channelIds=${NOLLYWOOD_CHANNEL_IDS.join(",")}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch channels");
        }

        const data = await response.json();
        setChannels(data.channels || []);
      } catch (err) {
        console.error("Error fetching YouTube channels:", err);
        setError(err instanceof Error ? err.message : "Failed to load channels");
        // Fallback to empty array if API fails
        setChannels([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannels();
  }, []);

  const handleChannelClick = (channelUrl: string) => {
    window.open(channelUrl, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 flex-shrink-0", className)}>
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 flex-shrink-0">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (error || channels.length === 0) {
    // Don't render anything if there's an error or no channels
    // You could also show a fallback UI here
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2 flex-shrink-0", className)}>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mr-1">
        <Youtube className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Nollywood</span>
      </div>
      {channels.slice(0, 2).map((channel) => (
        <Button
          key={channel.id}
          variant="outline"
          size="sm"
          onClick={() => handleChannelClick(channel.channelUrl)}
          className={cn(
            "h-8 px-2 gap-1.5 text-xs whitespace-nowrap cursor-pointer",
            "hover:bg-primary/10 hover:border-primary/50 transition-colors"
          )}
        >
          {channel.thumbnail && (
            <div className="relative h-5 w-5 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src={channel.thumbnail}
                alt={channel.title}
                fill
                className="object-cover"
                sizes="20px"
              />
            </div>
          )}
          <span className="truncate max-w-[100px]">{channel.title}</span>
          <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60" />
        </Button>
      ))}
    </div>
  );
}

