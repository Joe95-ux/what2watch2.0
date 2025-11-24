"use client";

import Image from "next/image";
import { ExternalLink, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useYouTubeChannels } from "@/hooks/use-youtube-channels";
import { YouTubeProfileSkeleton } from "./youtube-profile-skeleton";
import { useRouter } from "next/navigation";
import { getChannelProfilePath } from "@/lib/channel-path";

interface YouTubeProfilesProps {
  className?: string;
}

export default function YouTubeProfiles({ className }: YouTubeProfilesProps) {
  const { data: channels = [], isLoading, error } = useYouTubeChannels();
  const router = useRouter();

  const handleChannelClick = (channelId: string, slug: string | null | undefined, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(getChannelProfilePath(channelId, slug));
  };

  if (isLoading) {
    return <YouTubeProfileSkeleton variant="compact" count={2} className={className} />;
  }

  if (error || channels.length === 0) {
    // Don't render anything if there's an error or no channels
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
          onClick={(e) => handleChannelClick(channel.id, channel.slug, e)}
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

