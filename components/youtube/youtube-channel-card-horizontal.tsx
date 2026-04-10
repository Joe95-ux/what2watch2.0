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
import { ChannelReviewFormSheet } from "./channel-review-form-sheet";
import { useState } from "react";
import { useChannelReviews, ChannelReview } from "@/hooks/use-youtube-channel-reviews";
import { YouTubeAddToListDropdown } from "./add-channel-to-list-dropdown";

function formatCount(count: string | number): string {
  const num = typeof count === "string" ? parseInt(count, 10) : count;
  if (isNaN(num)) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

interface YouTubeChannelCardHorizontalProps {
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

export function YouTubeChannelCardHorizontal({ channel }: YouTubeChannelCardHorizontalProps) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { addToPool, removeFromPool } = useChannelPool();
  const [isReviewSheetOpen, setIsReviewSheetOpen] = useState(false);
  const [initialReview, setInitialReview] = useState<ChannelReview | null>(null);
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

  // Fetch viewer state to check if user has already reviewed
  const { data: reviewsData } = useChannelReviews(channel.channelId, {
    page: 1,
    limit: 1,
  });
  const viewerState = reviewsData?.viewerState;

  const handlePoolAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inUserPool) {
      removeFromPool.mutate(channel.channelId);
    } else {
      addToPool.mutate(channel.channelId);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if sheet is open
    if (isReviewSheetOpen) {
      return;
    }
    
    // Don't navigate if clicking on buttons or links
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a[href^='http']") ||
      target.closest("a[href^='/']") ||
      target.closest("[role='dialog']") ||
      target.closest("[data-radix-portal]") ||
      target.closest("[data-slot='sheet']") ||
      target.closest("[data-slot='sheet-content']") ||
      target.closest("[data-slot='sheet-overlay']")
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

  const handleReviewClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if user has already reviewed
    if (viewerState?.hasReview && viewerState.reviewId) {
      // Fetch the existing review
      try {
        const response = await fetch(`/api/youtube/channel-reviews/${viewerState.reviewId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.id) {
            setInitialReview({
              id: data.id,
              channelId: data.channelId,
              userId: data.userId,
              rating: data.rating,
              title: data.title,
              content: data.content,
              tags: data.tags,
              helpfulCount: data.helpfulCount,
              notHelpfulCount: data.notHelpfulCount,
              isEdited: data.isEdited,
              status: "published",
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              user: data.user,
              viewerHasVoted: data.viewerHasVoted,
              canEdit: data.canEdit,
            } as ChannelReview);
          } else {
            setInitialReview(null);
          }
        } else {
          setInitialReview(null);
        }
      } catch (error) {
        console.error("[YouTubeChannelCardHorizontal] Failed to fetch review:", error);
        setInitialReview(null);
      }
    } else {
      setInitialReview(null);
    }
    
    setIsReviewSheetOpen(true);
  };

  const handleCloseReviewSheet = () => {
    setIsReviewSheetOpen(false);
    // Reset initial review after a short delay to allow sheet to close
    setTimeout(() => {
      setInitialReview(null);
    }, 200);
  };

  // Determine if summary is negative based on rating
  const isNegativeSummary = channel.rating && channel.rating.average < 3;
  const summaryValues = channelSummary?.summary
    ? channelSummary.summary
        .split(" ")
        .map((word) => word.trim())
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div
      className="border-2 rounded-lg hover:border-primary/50 transition-colors cursor-pointer relative pb-14 overflow-hidden"
      onClick={handleCardClick}
    >
      {/* First Section: Profile Picture (1/3 width) + Channel Info (2/3 width) - No padding */}
      <div className="flex items-start" onClick={(e) => e.stopPropagation()}>
        {/* Profile Picture - Left, 1/3 width, flush with top and left, only top-left border radius */}
        <div className="flex-shrink-0 w-1/3">
          {isInDb ? (
            <Link href={profilePath} className="block">
              {channel.thumbnail ? (
                <Avatar className="h-full w-full aspect-square cursor-pointer ring-2 ring-border hover:ring-primary transition-all rounded-tl-lg">
                  <AvatarImage src={channel.thumbnail} alt={channelTitle} className="rounded-tl-lg" />
                  <AvatarFallback className="rounded-tl-lg">
                    <Youtube className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-full w-full aspect-square cursor-pointer ring-2 ring-border hover:ring-primary transition-all rounded-tl-lg">
                  <AvatarFallback className="rounded-tl-lg">
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
                <Avatar className="h-full w-full aspect-square ring-2 ring-border group-hover:ring-primary transition-all rounded-tl-lg">
                  <AvatarImage src={channel.thumbnail} alt={channelTitle} className="rounded-tl-lg" />
                  <AvatarFallback className="rounded-tl-lg">
                    <Youtube className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-full w-full aspect-square ring-2 ring-border group-hover:ring-primary transition-all rounded-tl-lg">
                  <AvatarFallback className="rounded-tl-lg">
                    <Youtube className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          )}
        </div>

        {/* Channel Info - Right, 2/3 width, with padding */}
        <div className="flex-1 min-w-0 p-4 space-y-2">
          {/* Channel Name - First Line */}
          <div>
            {isInDb ? (
              <Link href={profilePath} className="block">
                <h3 className="font-semibold hover:underline truncate text-left">
                  {channelTitle}
                </h3>
              </Link>
            ) : (
              <h3
                className="font-semibold hover:underline truncate cursor-pointer text-left"
                onClick={handleNameClick}
              >
                {channelTitle}
              </h3>
            )}
          </div>

          {/* Subscribers and Video Count - Second Line */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground text-left">
            <div className="flex items-center gap-1">
              <UsersRound className="h-4 w-4" />
              <span>{formatCount(channel.subscriberCount || "0")}</span>
            </div>
            <span>|</span>
            <div className="flex items-center gap-1">
              <Video className="h-4 w-4" />
              <span>{formatCount(channel.videoCount || "0")}</span>
            </div>
          </div>

          {/* Review / Add actions - Third Line */}
          <div className="text-left space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReviewClick}
                title="Review Channel"
                className={cn(
                  "h-auto w-auto p-0 px-0 border-0 bg-none hover:bg-none cursor-pointer",
                  channel.rating
                    ? "text-yellow-500 hover:text-yellow-500"
                    : "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                )}
              >
                {channel.rating ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                    <span>({channel.rating.count})</span>
                  </span>
                ) : (
                  <Star className="h-3.5 w-3.5 fill-none" />
                )}
              </Button>
              <YouTubeAddToListDropdown
                channel={{
                  channelId: channel.channelId,
                  title: channelTitle,
                  thumbnail: channel.thumbnail,
                  channelUrl,
                  subscriberCount: channel.subscriberCount || "0",
                  videoCount: channel.videoCount || "0",
                }}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs rounded-[20px] border-0 bg-transparent hover:bg-muted/60 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add to
                  </Button>
                }
              />
            </div>
            {/* YouTube Link - Under review average */}
            <Link
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block text-xs text-muted-foreground hover:text-primary"
            >
              <div className="flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                YouTube
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Separator - flush with profile photo */}
      <div className="border-t border-border" />

      {/* Second Section: Summary, Categories, Note - With padding */}
      <div className="p-4 space-y-3 text-left" onClick={(e) => e.stopPropagation()}>
        {/* Users found channel summary */}
        {channelSummary?.summary && (
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Users found channel: </span>
            <span
              className={cn(
                "text-sm font-medium",
                isNegativeSummary
                  ? "text-orange-700 dark:text-orange-400"
                  : "text-blue-700 dark:text-blue-400"
              )}
            >
              {summaryValues}
            </span>
          </div>
        )}

        {/* Channel Categories */}
        {channel.categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
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

        {/* Channel Note */}
        {channel.note && (
          <div>
            <p className="text-sm text-muted-foreground line-clamp-2">{channel.note}</p>
          </div>
        )}
      </div>

      {/* Pool Action Footer Button - Same as before */}
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

      {/* Review Sheet */}
      <ChannelReviewFormSheet
        channelId={channel.channelId}
        channelTitle={channelTitle}
        channelThumbnail={channel.thumbnail}
        isOpen={isReviewSheetOpen}
        onClose={handleCloseReviewSheet}
        initialReview={initialReview}
      />
    </div>
  );
}

export function YouTubeChannelCardHorizontalSkeleton() {
  return (
    <div className="border-2 rounded-lg relative pb-14 overflow-hidden">
      {/* First Section Skeleton - No padding */}
      <div className="flex items-start">
        <Skeleton className="w-1/3 aspect-square rounded-tl-lg" />
        <div className="flex-1 p-4 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-border" />

      {/* Second Section Skeleton - With padding */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-20 rounded" />
        </div>
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Footer Button Skeleton */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50">
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}
