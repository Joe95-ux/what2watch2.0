"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import YouTubeVideoCard from "@/components/youtube/youtube-video-card";
import { useFavoriteChannels } from "@/hooks/use-favorite-channels";
import { useFavoriteYouTubeVideos } from "@/hooks/use-favorite-youtube-videos";
import { useYouTubeVideoWatchlist } from "@/hooks/use-youtube-video-watchlist";
import { useUserYouTubePlaylists } from "@/hooks/use-user-youtube-playlists";
import { YouTubeVideo } from "@/hooks/use-youtube-channel";
import { getChannelProfilePath } from "@/lib/channel-path";

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
            <Skeleton key={idx} className="h-32 rounded-xl" />
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
          <button
            key={favorite.id}
            onClick={() => router.push(getChannelProfilePath(favorite.channelId, favorite.slug))}
            className="group rounded-2xl border border-border/60 p-4 text-left transition-colors hover:border-primary cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 rounded-full overflow-hidden bg-muted">
                {favorite.thumbnail ? (
                  <Image src={favorite.thumbnail} alt={favorite.title || "Channel"} fill className="object-cover" unoptimized />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm line-clamp-2">{favorite.title || "Channel"}</p>
                <p className="text-xs text-muted-foreground">@{favorite.slug?.replace("@", "") || favorite.channelId}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderVideoGrid = (items: ReturnType<typeof toYouTubeVideo>[], channelIds: string[]) => {
    if (items.length === 0) {
      return null;
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((video, index) => (
          <YouTubeVideoCard key={`${video.id}-${index}`} video={video} channelId={channelIds[index]} />
        ))}
      </div>
    );
  };

  const renderFavoriteVideos = () => {
    if (isLoadingFavoriteVideos) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-72 rounded-xl" />
          ))}
        </div>
      );
    }

    if (favoriteVideos.length === 0) {
      return <EmptyState message="No liked videos yet." />;
    }

    const videos = favoriteVideos.slice(0, 6).map(toYouTubeVideo);
    const channelIds = favoriteVideos.slice(0, 6).map((item) => item.channelId);

    return renderVideoGrid(videos, channelIds);
  };

  const renderWatchlistVideos = () => {
    if (isLoadingVideoWatchlist) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-72 rounded-xl" />
          ))}
        </div>
      );
    }

    if (watchlistVideos.length === 0) {
      return <EmptyState message="Your watch later list is empty." />;
    }

    const videos = watchlistVideos.slice(0, 6).map(toYouTubeVideo);
    const channelIds = watchlistVideos.slice(0, 6).map((item) => item.channelId);

    return renderVideoGrid(videos, channelIds);
  };

  const renderYouTubePlaylists = () => {
    if (isLoadingPlaylists) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, idx) => (
            <Skeleton key={idx} className="h-40 rounded-xl" />
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {youtubePlaylists.slice(0, 4).map((playlist) => (
          <Card key={playlist.id} className="border border-border/70 bg-card/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">{playlist.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {playlist.youtubeItemsCount} video{playlist.youtubeItemsCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => router.push(`/dashboard/playlists`)}>
                  View
                </Button>
              </div>
              <div className="flex gap-2">
                {playlist.previewItems.map((item) => (
                  <div key={item.id} className="relative h-16 flex-1 rounded-md overflow-hidden bg-muted">
                    {item.thumbnail ? (
                      <Image src={item.thumbnail} alt={item.title} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{item.title}</div>
                    )}
                  </div>
                ))}
                {playlist.previewItems.length === 0 && (
                  <div className="flex h-16 flex-1 items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground">
                    No previews
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-10">
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
  );
}


