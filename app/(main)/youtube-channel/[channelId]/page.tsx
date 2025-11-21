"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Heart, Bookmark, Youtube, ExternalLink, Loader2 } from "lucide-react";
import { useYouTubeChannel, useYouTubeChannelVideos, YouTubeVideo } from "@/hooks/use-youtube-channel";
import { useToggleFavoriteChannel } from "@/hooks/use-favorite-channels";
import { useToggleChannelWatchlist } from "@/hooks/use-channel-watchlist";
import YouTubeVideoCard from "@/components/youtube/youtube-video-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";

export default function YouTubeChannelPage() {
  const params = useParams();
  const router = useRouter();
  const channelId = params?.channelId as string;
  const { data: channel, isLoading: isLoadingChannel } = useYouTubeChannel(channelId);
  const [pageToken, setPageToken] = useState<string | undefined>();
  const { data: videosData, isLoading: isLoadingVideos } = useYouTubeChannelVideos(
    channelId,
    pageToken
  );
  const toggleFavorite = useToggleFavoriteChannel();
  const toggleWatchlist = useToggleChannelWatchlist();
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();

  const videos = videosData?.videos || [];
  const hasMore = videosData?.hasMore || false;
  const nextPageToken = videosData?.nextPageToken;

  const handleLoadMore = () => {
    if (nextPageToken) {
      setPageToken(nextPageToken);
    }
  };

  const handleVideoClick = (video: YouTubeVideo) => {
    window.open(video.videoUrl, "_blank", "noopener,noreferrer");
  };

  const requireAuth = async (action: () => Promise<void> | void, message?: string) => {
    if (!isSignedIn) {
      toast.error(message ?? "Please sign in to perform this action.");
      if (openSignIn) {
        openSignIn({
          afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
        });
      }
      return;
    }
    return action();
  };

  const formatSubscriberCount = (count: string) => {
    const num = parseInt(count, 10);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoadingChannel) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-64 w-full mb-8" />
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-full mb-8" />
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Channel not found</h1>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Channel Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="relative w-32 h-32 rounded-full overflow-hidden flex-shrink-0">
              {channel.thumbnail ? (
                <Image
                  src={channel.thumbnail}
                  alt={channel.title}
                  fill
                  className="object-cover"
                  sizes="128px"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <Youtube className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold mb-2">{channel.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <span>{formatSubscriberCount(channel.subscriberCount)} subscribers</span>
                <span>•</span>
                <span>{channel.videoCount} videos</span>
              </div>
              {channel.description && (
                <p className="text-sm text-foreground line-clamp-3 mb-4">
                  {channel.description}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={toggleFavorite.isFavorited(channelId) ? "default" : "outline"}
                  size="sm"
                  onClick={async () => {
                    await requireAuth(
                      () => toggleFavorite.toggle(channelId),
                      "Sign in to favorite channels."
                    );
                  }}
                  disabled={toggleFavorite.isLoading}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 mr-2",
                      toggleFavorite.isFavorited(channelId) && "fill-current"
                    )}
                  />
                  {toggleFavorite.isFavorited(channelId) ? "Favorited" : "Favorite"}
                </Button>
                <Button
                  variant={toggleWatchlist.isInWatchlist(channelId) ? "default" : "outline"}
                  size="sm"
                  onClick={async () => {
                    await requireAuth(
                      () => toggleWatchlist.toggle(channelId),
                      "Sign in to manage watchlist."
                    );
                  }}
                  disabled={toggleWatchlist.isLoading}
                >
                  <Bookmark
                    className={cn(
                      "h-4 w-4 mr-2",
                      toggleWatchlist.isInWatchlist(channelId) && "fill-current"
                    )}
                  />
                  {toggleWatchlist.isInWatchlist(channelId) ? "In Watchlist" : "Add to Watchlist"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(channel.channelUrl, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on YouTube
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Videos Grid */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Videos</h2>
          {isLoadingVideos && videos.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-lg" />
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No videos found.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {videos.map((video) => (
                  <YouTubeVideoCard
                    key={video.id}
                    video={video}
                    onVideoClick={handleVideoClick}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isLoadingVideos}
                  >
                    {isLoadingVideos ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

