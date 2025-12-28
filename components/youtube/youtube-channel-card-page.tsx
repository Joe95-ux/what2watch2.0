"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Star, UsersRound, Video, ExternalLink, Youtube, Plus, X } from "lucide-react";
import { getChannelProfilePath } from "@/lib/channel-path";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useChannelPool } from "@/hooks/use-channel-pool";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

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
    note?: string | null;
    inUserPool?: boolean;
  };
}

export function YouTubeChannelCardPage({ channel }: YouTubeChannelCardPageProps) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { addToPool, removeFromPool } = useChannelPool();
  const channelTitle = channel.title || "Unknown Channel";
  const channelUrl = channel.channelUrl || `https://www.youtube.com/channel/${channel.channelId}`;
  const displayName = channelTitle.length > 30 ? channelTitle.slice(0, 30) + "..." : channelTitle;
  const profilePath = getChannelProfilePath(channel.channelId, channel.slug);
  const isInDb = Boolean(channel.slug);
  const inUserPool = channel.inUserPool ?? false;

  // Fetch channel summary
  const { data: channelSummary } = useQuery<{ summary: string | null }>({
    queryKey: ["channel-summary", channel.channelId],
    queryFn: async () => {
      const response = await fetch(`/api/youtube/channels/${channel.channelId}/summary`);
      if (!response.ok) return { summary: null };
      return response.json();
    },
    enabled: isInDb, // Only fetch if channel is in database
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  });

  const handlePoolAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inUserPool) {
      removeFromPool.mutate(channel.channelId);
    } else {
      addToPool.mutate(channel.channelId);
    }
  };

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
    if (isInDb) {
      router.push(profilePath);
    } else {
      window.open(channelUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInDb) {
      router.push(profilePath);
    } else {
      window.open(channelUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Determine if summary is negative based on rating
  const isNegativeSummary = channel.rating && channel.rating.average < 3;
  const summaryWords = channelSummary?.summary ? channelSummary.summary.split(" ") : [];

  return (
    <div
      className="border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer relative pb-14"
      onClick={handleCardClick}
    >
      {/* YouTube Link - Top Right */}
      <Link
        href={channelUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary z-10"
      >
        <ExternalLink className="h-3 w-3" />
        YouTube
      </Link>

      {/* First Section: Circular Avatar in Center */}
      <div className="flex justify-center mb-4" onClick={(e) => e.stopPropagation()}>
        {isInDb ? (
          <Link href={profilePath} className="relative group">
            {channel.thumbnail ? (
              <Avatar className="h-16 w-16 cursor-pointer ring-2 ring-border group-hover:ring-primary transition-all">
                <AvatarImage src={channel.thumbnail} alt={channelTitle} />
                <AvatarFallback>
                  <Youtube className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-16 w-16 cursor-pointer ring-2 ring-border group-hover:ring-primary transition-all">
                <AvatarFallback>
                  <Youtube className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
            )}
          </Link>
        ) : (
          <div
            className="relative group cursor-pointer"
            onClick={handleNameClick}
          >
            {channel.thumbnail ? (
              <Avatar className="h-16 w-16 ring-2 ring-border group-hover:ring-primary transition-all">
                <AvatarImage src={channel.thumbnail} alt={channelTitle} />
                <AvatarFallback>
                  <Youtube className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-16 w-16 ring-2 ring-border group-hover:ring-primary transition-all">
                <AvatarFallback>
                  <Youtube className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )}
      </div>

      {/* Second Section: Profile Name and Metadata */}
      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
        {/* First Line: Profile Name - Center Aligned */}
        <div className="text-center">
          {isInDb ? (
            <Link href={profilePath} className="block">
              <h3 className="font-semibold hover:underline truncate">
                {channelTitle}
              </h3>
            </Link>
          ) : (
            <h3
              className="font-semibold hover:underline truncate cursor-pointer"
              onClick={handleNameClick}
            >
              {channelTitle}
            </h3>
          )}
        </div>

        {/* Second Line: Users found channel with summary tags - Center Aligned */}
        {channelSummary?.summary && (
          <div className="text-center">
            <span className="text-sm text-muted-foreground">Users found channel: </span>
            <div className="inline-flex flex-wrap items-center gap-1.5 mt-1">
              {summaryWords.map((word, index) => (
                <span
                  key={index}
                  className={cn(
                    "px-2 py-0.5 rounded-md border text-xs font-medium",
                    isNegativeSummary
                      ? "bg-orange-500/20 border-orange-500/30 text-orange-700 dark:text-orange-400"
                      : "bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-400"
                  )}
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Separator */}
        <div className="border-t border-border" />

        {/* Next Line: Subscriber count | Video count | Review count - Center Aligned */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1">
            <UsersRound className="h-4 w-4" />
            <span>{formatCount(channel.subscriberCount || "0")}</span>
          </div>
          <span>|</span>
          <div className="flex items-center gap-1">
            <Video className="h-4 w-4" />
            <span>{formatCount(channel.videoCount || "0")}</span>
          </div>
          <span>|</span>
          {channel.rating ? (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-3 w-3",
                    star <= Math.round(channel.rating!.average)
                      ? "fill-yellow-500 text-yellow-500"
                      : "fill-none text-muted-foreground"
                  )}
                />
              ))}
              <span>({channel.rating.count})</span>
            </div>
          ) : (
            <span className="text-muted-foreground">review channel</span>
          )}
        </div>

        {/* Another Separator */}
        {channel.categories.length > 0 && <div className="border-t border-border" />}

        {/* Channel Categories - Center Aligned */}
        {channel.categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 justify-center mb-2">
            {channel.categories.slice(0, 6).map((category) => (
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
      </div>

      {/* Note */}
      {channel.note && (
        <div className="mt-3 mb-3">
          <p className="text-sm text-muted-foreground line-clamp-2 text-center">{channel.note}</p>
        </div>
      )}

      {/* Pool Action Footer Button - Trello style */}
      {isSignedIn && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50">
          <button
            onClick={handlePoolAction}
            disabled={addToPool.isPending || removeFromPool.isPending}
            className={cn(
              "text-sm text-muted-foreground hover:text-foreground transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-1.5 w-full cursor-pointer"
            )}
          >
            {inUserPool ? (
              <>
                <X className="h-4 w-4" />
                <span>Remove from My Feed</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>Add to My Feed</span>
              </>
            )}
          </button>
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
