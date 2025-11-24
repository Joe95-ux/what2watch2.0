"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import YouTubeVideoCard from "@/components/youtube/youtube-video-card";
import { useFavoriteChannels, type FavoriteChannel } from "@/hooks/use-favorite-channels";
import { useFavoriteYouTubeVideos } from "@/hooks/use-favorite-youtube-videos";
import { useYouTubeVideoWatchlist } from "@/hooks/use-youtube-video-watchlist";
import { useUserYouTubePlaylists, type UserYouTubePlaylistPreview } from "@/hooks/use-user-youtube-playlists";
import { YouTubeVideo } from "@/hooks/use-youtube-channel";
import { getChannelProfilePath } from "@/lib/channel-path";
import { useQuery } from "@tanstack/react-query";
import { Users, Video } from "lucide-react";

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function formatUpdatedAt(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Updated recently";
  const diffInDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
  if (diffInDays === 0) return "Updated today";
  if (diffInDays === 1) return "Updated yesterday";
  return `Updated ${diffInDays}d ago`;
}

function formatCount(count: string | number): string {
  const num = typeof count === "string" ? parseInt(count, 10) : count;
  if (isNaN(num)) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

async function fetchChannelStats(channelId: string) {
  const response = await fetch(`/api/youtube/channels/${channelId}`);
  if (!response.ok) {
    return { subscriberCount: "0", videoCount: "0" };
  }
  const data = await response.json();
  return {
    subscriberCount: data.channel?.subscriberCount || "0",
    videoCount: data.channel?.videoCount || "0",
  };
}

function FavoriteChannelCard({ favorite }: { favorite: FavoriteChannel }) {
  const router = useRouter();
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["channel-stats", favorite.channelId],
    queryFn: () => fetchChannelStats(favorite.channelId),
    staleTime: 1000 * 60 * 15, // 15 minutes
  });

  return (
    <button
      onClick={() => router.push(getChannelProfilePath(favorite.channelId, favorite.slug))}
      className="group rounded-2xl border border-border/60 p-4 text-left transition-colors hover:border-primary cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 rounded-full overflow-hidden bg-muted flex-shrink-0">
          {favorite.thumbnail ? (
            <Image src={favorite.thumbnail} alt={favorite.title || "Channel"} fill className="object-cover" unoptimized />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm line-clamp-1 mb-1">{favorite.title || "Channel"}</p>
          {isLoadingStats ? (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-12" />
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{formatCount(stats?.subscriberCount || "0")}</span>
              </div>
              <div className="flex items-center gap-1">
                <Video className="h-3 w-3" />
                <span>{formatCount(stats?.videoCount || "0")}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function PlaylistPreviewStrip({ items }: { items: UserYouTubePlaylistPreview["previewItems"] }) {
  const previews = items.slice(0, 3);
  const placeholders = Math.max(0, 3 - previews.length);

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      {previews.map((item) => (
        <div key={item.id} className="relative flex-1 min-h-[110px] overflow-hidden rounded-xl bg-muted">
          {item.thumbnail ? (
            <Image src={item.thumbnail} alt={item.title} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
              {item.title}
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="pointer-events-none absolute inset-x-3 bottom-3">
            <p className="text-xs font-semibold text-white line-clamp-2">{item.title}</p>
            {item.channelTitle && <p className="text-[0.65rem] text-white/70">{item.channelTitle}</p>}
          </div>
        </div>
      ))}
      {Array.from({ length: placeholders }).map((_, idx) => (
        <div
          key={`placeholder-${idx}`}
          className="flex flex-1 min-h-[110px] items-center justify-center rounded-xl border border-dashed border-border/70 text-xs text-muted-foreground"
        >
          Add more videos
        </div>
      ))}
    </div>
  );
}

function YouTubePlaylistCard({
  playlist,
  onView,
}: {
  playlist: UserYouTubePlaylistPreview;
  onView: (playlistId: string) => void;
}) {
  const leadChannel = playlist.previewItems[0]?.channelTitle;

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Playlist</p>
          <h3 className="text-lg font-semibold text-foreground">{playlist.name}</h3>
          {playlist.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{playlist.description}</p>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="cursor-pointer self-start sm:self-auto"
          onClick={() => onView(playlist.id)}
        >
          View
        </Button>
      </div>
      <PlaylistPreviewStrip items={playlist.previewItems} />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          {playlist.youtubeItemsCount} video{playlist.youtubeItemsCount === 1 ? "" : "s"}
        </span>
        <span>•</span>
        <span>{formatUpdatedAt(playlist.updatedAt)}</span>
        {leadChannel && (
          <>
            <span>•</span>
            <span>{leadChannel}</span>
          </>
        )}
      </div>
    </div>
  );
}

function toYouTubeVideo(item: {
  videoId: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  channelId: string;
  channelTitle?: string | null;
  duration?: string | null;
  videoUrl: string;
  publishedAt?: string | null;
}): YouTubeVideo {
  return {
    id: item.videoId,
    title: item.title,
    description: item.description ?? "",
    thumbnail: item.thumbnail ?? undefined,
    channelId: item.channelId,
    channelTitle: item.channelTitle ?? "",
    publishedAt: item.publishedAt ?? new Date().toISOString(),
    duration: item.duration ?? undefined,
    videoUrl: item.videoUrl,
  };
}

export default function YouTubeDashboardContent() {
  const router = useRouter();
  const { data: favoriteChannels = [], isLoading: isLoadingFavoriteChannels } = useFavoriteChannels();
  const { data: favoriteVideos = [], isLoading: isLoadingFavoriteVideos } = useFavoriteYouTubeVideos();
  const { data: watchlistVideos = [], isLoading: isLoadingVideoWatchlist } = useYouTubeVideoWatchlist();
  const { data: youtubePlaylists = [], isLoading: isLoadingPlaylists } = useUserYouTubePlaylists();

  const renderFavoriteChannels = () => {
    if (isLoadingFavoriteChannels) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Skeleton key={idx} className="h-20 rounded-xl" />
          ))}
        </div>
      );
    }

    if (favoriteChannels.length === 0) {
      return <EmptyState message="You haven't favorited any channels yet." />;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {favoriteChannels.slice(0, 8).map((favorite) => (
          <FavoriteChannelCard key={favorite.id} favorite={favorite} />
        ))}
      </div>
    );
  };

  const renderVideoCarousel = (items: ReturnType<typeof toYouTubeVideo>[], channelIds: string[]) => {
    if (items.length === 0) {
      return null;
    }
    return (
      <div className="relative group/carousel">
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 6,
            breakpoints: {
              "(max-width: 640px)": { slidesToScroll: 1 },
              "(max-width: 768px)": { slidesToScroll: 2 },
              "(max-width: 1024px)": { slidesToScroll: 3 },
              "(max-width: 1280px)": { slidesToScroll: 4 },
              "(max-width: 1536px)": { slidesToScroll: 5 },
            },
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4 gap-4">
            {items.map((video, index) => (
              <CarouselItem key={`${video.id}-${index}`} className="pl-2 md:pl-4 basis-[280px] sm:basis-[300px] lg:basis-[320px]">
                <YouTubeVideoCard video={video} channelId={channelIds[index]} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious 
            className="left-0 h-full w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
          <CarouselNext 
            className="right-0 h-full w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
        </Carousel>
      </div>
    );
  };

  const renderFavoriteVideos = () => {
    if (isLoadingFavoriteVideos) {
      return (
        <div className="relative group/carousel">
          <div className="flex gap-4 overflow-x-hidden">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} className="h-72 w-[280px] sm:w-[300px] lg:w-[320px] flex-shrink-0 rounded-xl" />
            ))}
          </div>
        </div>
      );
    }

    if (favoriteVideos.length === 0) {
      return <EmptyState message="No liked videos yet." />;
    }

    const videos = favoriteVideos.map(toYouTubeVideo);
    const channelIds = favoriteVideos.map((item) => item.channelId);

    return renderVideoCarousel(videos, channelIds);
  };

  const renderWatchlistVideos = () => {
    if (isLoadingVideoWatchlist) {
      return (
        <div className="relative group/carousel">
          <div className="flex gap-4 overflow-x-hidden">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} className="h-72 w-[280px] sm:w-[300px] lg:w-[320px] flex-shrink-0 rounded-xl" />
            ))}
          </div>
        </div>
      );
    }

    if (watchlistVideos.length === 0) {
      return <EmptyState message="Your watch later list is empty." />;
    }

    const videos = watchlistVideos.map(toYouTubeVideo);
    const channelIds = watchlistVideos.map((item) => item.channelId);

    return renderVideoCarousel(videos, channelIds);
  };

  const renderYouTubePlaylists = () => {
    if (isLoadingPlaylists) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, idx) => (
            <Skeleton key={idx} className="h-52 rounded-2xl" />
          ))}
        </div>
      );
    }

    if (youtubePlaylists.length === 0) {
      return (
        <EmptyState
          message="No playlists with YouTube videos yet."
          action={
            <Button onClick={() => router.push("/dashboard/playlists")} variant="outline" className="cursor-pointer">
              Create a playlist
            </Button>
          }
        />
      );
    }

    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {youtubePlaylists.slice(0, 4).map((playlist) => (
          <YouTubePlaylistCard key={playlist.id} playlist={playlist} onView={() => router.push("/dashboard/playlists")} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 space-y-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">YouTube Control Center</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Track the channels, videos, and playlists you&apos;ve saved from YouTube in one place.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="cursor-pointer" onClick={() => router.push("/dashboard")}>
              Back to dashboard
            </Button>
            <Button className="cursor-pointer" onClick={() => router.push("/dashboard/playlists")}>
              Manage playlists
            </Button>
          </div>
        </div>

        <div className="space-y-12">
          <Section title="Favorite Channels" description="Channels you like to keep up with.">
            {renderFavoriteChannels()}
          </Section>

          <Section title="Favorite Videos" description="Videos you liked recently.">
            {renderFavoriteVideos()}
          </Section>

          <Section title="Watch Later" description="Videos saved for later.">
            {renderWatchlistVideos()}
          </Section>

          <Section title="Playlists with YouTube videos" description="Your playlists that include YouTube clips.">
            {renderYouTubePlaylists()}
          </Section>
        </div>
      </div>
    </div>
  );
}


