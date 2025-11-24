"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Heart, Youtube, ExternalLink, Loader2, ChevronDown, ChevronUp, Search } from "lucide-react";
import {
  useYouTubeChannel,
  useYouTubeChannelVideos,
  useYouTubeChannelPlaylists,
  useYouTubeChannelPosts,
  YouTubeVideo,
  YouTubePlaylist,
  YouTubePost,
} from "@/hooks/use-youtube-channel";
import { useToggleFavoriteChannel } from "@/hooks/use-favorite-channels";
import YouTubeVideoCard from "@/components/youtube/youtube-video-card";
import { YouTubePlaylistCard } from "@/components/youtube/youtube-playlist-card";
import YouTubeChannelStickyNav from "@/components/youtube/youtube-channel-sticky-nav";
import YouTubeChannelSkeleton from "@/components/youtube/youtube-channel-skeleton";
import YouTubePosts from "@/components/youtube/youtube-posts";
import { YouTubeChannelSidebar } from "@/components/youtube/youtube-channel-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";

interface YouTubeChannelPageClientProps {
  channelId: string;
}

export default function YouTubeChannelPageClient({ channelId }: YouTubeChannelPageClientProps) {
  const router = useRouter();
  const { data: channel, isLoading: isLoadingChannel } = useYouTubeChannel(channelId);
  const [pageToken, setPageToken] = useState<string | undefined>();
  const [playlistsPageToken, setPlaylistsPageToken] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("home");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [accumulatedVideos, setAccumulatedVideos] = useState<YouTubeVideo[]>([]);
  const [postsPageToken, setPostsPageToken] = useState<string | undefined>();
  const [accumulatedPosts, setAccumulatedPosts] = useState<YouTubePost[]>([]);
  const heroRef = useRef<HTMLDivElement>(null);

  const {
    data: videosData,
    isLoading: isLoadingVideos,
    isFetching: isFetchingVideos,
    isError: isErrorVideos,
    refetch: refetchVideos,
  } = useYouTubeChannelVideos(channelId, pageToken);
  const { data: playlistsData, isLoading: isLoadingPlaylists } = useYouTubeChannelPlaylists(
    channelId,
    playlistsPageToken
  );
  const { data: postsData, isLoading: isLoadingPosts } = useYouTubeChannelPosts(channelId, postsPageToken);
  const toggleFavorite = useToggleFavoriteChannel();
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();

  useEffect(() => {
    if (videosData?.videos) {
      if (pageToken) {
        setAccumulatedVideos((prev) => [...prev, ...videosData.videos]);
      } else {
        setAccumulatedVideos(videosData.videos);
      }
    }
  }, [videosData, pageToken]);

  useEffect(() => {
    if (postsData?.posts) {
      if (postsPageToken) {
        setAccumulatedPosts((prev) => [...prev, ...postsData.posts]);
      } else {
        setAccumulatedPosts(postsData.posts);
      }
    }
  }, [postsData, postsPageToken]);

  useEffect(() => {
    setAccumulatedVideos([]);
    setAccumulatedPosts([]);
    setPageToken(undefined);
    setPostsPageToken(undefined);
  }, [channelId]);

  const videos = accumulatedVideos;
  const hasMore = videosData?.hasMore || false;
  const nextPageToken = videosData?.nextPageToken;

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

  const handleLoadMorePosts = () => {
    if (postsData?.nextPageToken) {
      setPostsPageToken(postsData.nextPageToken);
    }
  };

  const posts = accumulatedPosts;
  const hasMorePosts = postsData?.hasMore || false;

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

  const handleSearchClick = () => {
    setActiveTab("videos");
    setShowSearch(true);
  };

  const filteredVideos = videos.filter((video) => {
    if (showSearch && searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        video.title.toLowerCase().includes(query) || video.description.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    if (activeTab === "shorts") {
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

  const getTruncatedDescription = (description: string, maxWords: number = 4) => {
    const words = description.split(/\s+/);
    if (words.length <= maxWords) return description;
    return words.slice(0, maxWords).join(" ") + "...";
  };

  const descriptionNeedsTruncation = channel?.description && channel.description.split(/\s+/).length > 4;

  if (isLoadingChannel) {
    return <YouTubeChannelSkeleton />;
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Channel not found</h1>
          <Button onClick={() => router.back()} className="cursor-pointer">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <YouTubeChannelSidebar currentChannelId={channelId} />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div ref={heroRef} className="mb-8">
          {channel.bannerImage ? (
            <div className="relative w-full h-[206px] overflow-hidden rounded-lg">
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
            <div className="w-full h-[206px] bg-gradient-to-r from-muted via-muted/80 to-muted rounded-lg" />
          )}
        </div>

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
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

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{channel.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <span>{formatSubscriberCount(channel.subscriberCount)} subscribers</span>
                <span>•</span>
                <span>{channel.videoCount} videos</span>
              </div>

              {channel.description && (
                <div className="mb-4">
                  <p className="text-sm text-foreground">
                    {isDescriptionExpanded ? channel.description : getTruncatedDescription(channel.description, 4)}
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

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={toggleFavorite.isFavorited(channelId) ? "default" : "outline"}
                  size="sm"
                  onClick={async () => {
                    await requireAuth(() => toggleFavorite.toggle(channelId), "Sign in to favorite channels.");
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

        <div className="py-8">
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
            <YouTubePosts
              posts={posts}
              isLoading={isLoadingPosts}
              hasMore={hasMorePosts}
              onLoadMore={handleLoadMorePosts}
              isLoadingMore={isLoadingPosts && postsPageToken !== undefined}
            />
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
                      <YouTubePlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        onClick={() => window.open(playlist.playlistUrl, "_blank", "noopener,noreferrer")}
                      />
                    ))}
                  </div>
                  {hasMorePlaylists && (
                    <div className="text-center mt-6">
                      <Button
                        onClick={handleLoadMorePlaylists}
                        disabled={isLoadingPlaylists}
                        className="cursor-pointer min-w-[200px]"
                      >
                        {isLoadingPlaylists ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Load more playlists"
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {["home", "videos", "shorts"].includes(activeTab) && (
            <>
              {videos.length === 0 && (isLoadingVideos || isFetchingVideos) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-video rounded-lg" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-4">
                  <p>{isErrorVideos ? "We couldn't load videos. Please try again." : "No videos found."}</p>
                  {isErrorVideos && (
                    <Button variant="outline" onClick={() => refetchVideos()} className="cursor-pointer">
                      Retry
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredVideos.map((video: YouTubeVideo) => (
                      <YouTubeVideoCard
                        key={video.id}
                        video={video}
                        channelId={channelId}
                        onVideoClick={() => handleVideoClick(video)}
                      />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="text-center mt-6">
                      <Button
                        onClick={handleLoadMore}
                        disabled={isLoadingVideos}
                        className="cursor-pointer min-w-[200px]"
                      >
                        {isLoadingVideos ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Load more videos"
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
    </div>
  );
}

