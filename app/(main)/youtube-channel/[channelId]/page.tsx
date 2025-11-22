"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Heart, Youtube, ExternalLink, Loader2, ChevronDown, ChevronUp, Search } from "lucide-react";
import { useYouTubeChannel, useYouTubeChannelVideos, useYouTubeChannelPlaylists, YouTubeVideo, YouTubePlaylist } from "@/hooks/use-youtube-channel";
import { useToggleFavoriteChannel } from "@/hooks/use-favorite-channels";
import YouTubeVideoCard from "@/components/youtube/youtube-video-card";
import YouTubeChannelStickyNav from "@/components/youtube/youtube-channel-sticky-nav";
import YouTubeChannelSkeleton from "@/components/youtube/youtube-channel-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [playlistsPageToken, setPlaylistsPageToken] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("videos");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  
  const { data: videosData, isLoading: isLoadingVideos } = useYouTubeChannelVideos(
    channelId,
    pageToken
  );
  const { data: playlistsData, isLoading: isLoadingPlaylists } = useYouTubeChannelPlaylists(
    channelId,
    playlistsPageToken
  );
  const toggleFavorite = useToggleFavoriteChannel();
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();

  const videos = videosData?.videos || [];
  const hasMore = videosData?.hasMore || false;
  const nextPageToken = videosData?.nextPageToken;

  // Track scroll for sticky nav
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLoadMore = () => {
    if (nextPageToken) {
      setPageToken(nextPageToken);
    }
  };

  const handleLoadMorePlaylists = () => {
    if (playlistsData?.nextPageToken) {
      setPlaylistsPageToken(playlistsData.nextPageToken);
    }
  };

  const playlists = playlistsData?.playlists || [];
  const hasMorePlaylists = playlistsData?.hasMore || false;

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

  // Handle search button click - reset to videos tab and show search
  const handleSearchClick = () => {
    setActiveTab("videos");
    setShowSearch(true);
  };

  // Filter videos based on active tab and search query
  const filteredVideos = videos.filter((video) => {
    // Apply search filter if search is active
    if (showSearch && searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        video.title.toLowerCase().includes(query) ||
        video.description.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }

    if (activeTab === "shorts") {
      // Shorts are typically less than 60 seconds
      if (!video.duration) return false;
      const durationMatch = video.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!durationMatch) return false;
      const hours = parseInt(durationMatch[1] || "0", 10);
      const minutes = parseInt(durationMatch[2] || "0", 10);
      const seconds = parseInt(durationMatch[3] || "0", 10);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      return totalSeconds <= 60;
    }
    if (activeTab === "videos") {
      // Regular videos (not shorts)
      if (!video.duration) return true;
      const durationMatch = video.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!durationMatch) return true;
      const hours = parseInt(durationMatch[1] || "0", 10);
      const minutes = parseInt(durationMatch[2] || "0", 10);
      const seconds = parseInt(durationMatch[3] || "0", 10);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      return totalSeconds > 60;
    }
    return true;
  });

  // Truncate description to first 4 words
  const getTruncatedDescription = (description: string, maxWords: number = 4) => {
    const words = description.split(/\s+/);
    if (words.length <= maxWords) return description;
    return words.slice(0, maxWords).join(" ") + "...";
  };

  // Check if description needs truncation (more than 4 words)
  const descriptionNeedsTruncation = channel?.description && channel.description.split(/\s+/).length > 4;

  if (isLoadingChannel) {
    return <YouTubeChannelSkeleton />;
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Channel not found</h1>
          <Button onClick={() => router.back()} className="cursor-pointer">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Channel Info Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Banner Section - Same width as content container */}
        <div ref={heroRef} className="mb-8">
          {channel.bannerImage ? (
            <div className="relative w-full h-[282px] overflow-hidden rounded-lg">
              <Image
                src={channel.bannerImage}
                alt={`${channel.title} banner`}
                fill
                className="object-cover"
                sizes="100vw"
                priority
                unoptimized
              />
            </div>
          ) : (
            <div className="w-full h-[282px] bg-gradient-to-r from-muted via-muted/80 to-muted rounded-lg" />
          )}
        </div>

        {/* Channel Info Section - No overlap with banner */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {/* Avatar */}
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden flex-shrink-0 border-4 border-background shadow-lg">
              {channel.thumbnail ? (
                <Image
                  src={channel.thumbnail}
                  alt={channel.title}
                  fill
                  className="object-cover"
                  sizes="160px"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <Youtube className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Channel Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{channel.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <span>{formatSubscriberCount(channel.subscriberCount)} subscribers</span>
                <span>•</span>
                <span>{channel.videoCount} videos</span>
              </div>

              {/* Description with Read More */}
              {channel.description && (
                <div className="mb-4">
                  <p className="text-sm text-foreground">
                    {isDescriptionExpanded 
                      ? channel.description 
                      : getTruncatedDescription(channel.description, 4)}
                  </p>
                  {descriptionNeedsTruncation && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="mt-2 h-auto p-0 text-sm text-primary hover:text-primary/80 cursor-pointer"
                    >
                      {isDescriptionExpanded ? (
                        <>
                          Show less
                          <ChevronUp className="h-4 w-4 ml-1" />
                        </>
                      ) : (
                        <>
                          Read more
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Action Buttons */}
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
                  className="cursor-pointer"
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 mr-2",
                      toggleFavorite.isFavorited(channelId) && "fill-red-500 text-red-500"
                    )}
                  />
                  {toggleFavorite.isFavorited(channelId) ? "Favorited" : "Favorite"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(channel.channelUrl, "_blank", "noopener,noreferrer")}
                  className="cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on YouTube
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Navigation */}
        <div className="mb-4">
          <YouTubeChannelStickyNav
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              if (tab !== "videos") {
                setShowSearch(false);
                setSearchQuery("");
              }
            }}
            onSearchClick={handleSearchClick}
            isScrolled={isScrolled}
          />
        </div>

        {/* Tab Content */}
        <div className="py-8">
          {/* Search Bar - Show when search is active */}
          {showSearch && activeTab === "videos" && (
            <div className="mb-4">
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search channel videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>
          )}

          {activeTab === "posts" && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Posts feature coming soon.</p>
            </div>
          )}

          {activeTab === "playlists" && (
            <>
              {isLoadingPlaylists && playlists.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-video rounded-lg" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : playlists.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No playlists found.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {playlists.map((playlist: YouTubePlaylist) => (
                      <a
                        key={playlist.id}
                        href={playlist.playlistUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group cursor-pointer"
                      >
                        <div className="space-y-2">
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                            {playlist.thumbnail ? (
                              <Image
                                src={playlist.thumbnail}
                                alt={playlist.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 640px) 200px, 300px"
                                unoptimized
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Youtube className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-medium">
                              {playlist.itemCount} videos
                            </div>
                          </div>
                          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                            {playlist.title}
                          </h3>
                          {playlist.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {playlist.description}
                            </p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                  {hasMorePlaylists && (
                    <div className="flex justify-center mt-8">
                      <Button
                        variant="outline"
                        onClick={handleLoadMorePlaylists}
                        disabled={isLoadingPlaylists}
                        className="cursor-pointer"
                      >
                        {isLoadingPlaylists ? (
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
            </>
          )}

          {(activeTab === "videos" || activeTab === "shorts") && (
            <>
              {isLoadingVideos && videos.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-video rounded-lg" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>
                    {showSearch && searchQuery
                      ? `No videos found matching "${searchQuery}".`
                      : `No ${activeTab} found.`}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredVideos.map((video) => (
                      <YouTubeVideoCard
                        key={video.id}
                        video={video}
                        onVideoClick={handleVideoClick}
                        channelId={channelId}
                      />
                    ))}
                  </div>
                  {hasMore && activeTab === "videos" && (
                    <div className="flex justify-center mt-8">
                      <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        disabled={isLoadingVideos}
                        className="cursor-pointer"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
