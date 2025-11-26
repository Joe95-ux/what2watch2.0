"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Users, Video, ExternalLink, Youtube } from "lucide-react";
import { getChannelProfilePath } from "@/lib/channel-path";
import { cn } from "@/lib/utils";
import Link from "next/link";

function formatCount(count: string | number): string {
  const num = typeof count === "string" ? parseInt(count, 10) : count;
  if (isNaN(num)) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

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
    subscriberCount?: string;
    videoCount?: string;
  };
}

export function YouTubeChannelCardPage({ channel }: YouTubeChannelCardPageProps) {
  const router = useRouter();
  const channelTitle = channel.title || "Unknown Channel";
  const channelUrl = channel.channelUrl || `https://www.youtube.com/channel/${channel.channelId}`;
  const displayName = channelTitle.length > 30 ? channelTitle.slice(0, 30) + "..." : channelTitle;
  const profilePath = getChannelProfilePath(channel.channelId, channel.slug);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or links
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a[href^='http']") ||
      target.closest("a[href^='/']")
    ) {
      return;
    }
    router.push(profilePath);
  };

  return (
    <div
      className="border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="relative group flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Link href={profilePath} className="relative group">
            {channel.thumbnail ? (
              <Avatar className="h-12 w-12 cursor-pointer ring-2 ring-border group-hover:ring-primary transition-all">
                <AvatarImage src={channel.thumbnail} alt={channelTitle} />
                <AvatarFallback>
                  <Youtube className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-12 w-12 cursor-pointer ring-2 ring-border group-hover:ring-primary transition-all">
                <AvatarFallback>
                  <Youtube className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
            )}
          </Link>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
              <Link href={profilePath} className="block">
                <h3 className="font-semibold hover:underline truncate flex items-center gap-2">
                  {displayName}
                </h3>
              </Link>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{formatCount(channel.subscriberCount || "0")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  <span>{formatCount(channel.videoCount || "0")}</span>
                </div>
              </div>
              <Link
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-1"
              >
                <ExternalLink className="h-3 w-3" />
                YouTube
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Category Badges */}
      {channel.categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {channel.categories.slice(0, 4).map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="text-xs font-medium bg-muted/70"
            >
              {category}
            </Badge>
          ))}
        </div>
      )}

      {/* Rating */}
      {channel.rating && (
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 fill-primary text-primary" />
          <span className="text-sm font-medium">{channel.rating.average}</span>
          <span className="text-xs text-muted-foreground">({channel.rating.count})</span>
        </div>
      )}
    </div>
  );
}

export function YouTubeChannelCardPageSkeleton() {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton className="h-5 w-32 mb-2" />
          <div className="flex items-center gap-3 mb-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-5 w-16 rounded" />
        <Skeleton className="h-5 w-16 rounded" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  );
}
