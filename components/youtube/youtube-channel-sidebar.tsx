"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Heart, Bookmark, Sparkles, Youtube, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useFavoriteChannels } from "@/hooks/use-favorite-channels";
import { useFavoriteYouTubeVideos } from "@/hooks/use-favorite-youtube-videos";
import { useYouTubeVideoWatchlist } from "@/hooks/use-youtube-video-watchlist";
import { useYouTubeRecommendations } from "@/hooks/use-youtube-recommendations";
import { useYouTubeChannels } from "@/hooks/use-youtube-channels";
import { getChannelProfilePath } from "@/lib/channel-path";
import Image from "next/image";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface YouTubeChannelSidebarProps {
  currentChannelId?: string;
}

export function YouTubeChannelSidebar({ currentChannelId }: YouTubeChannelSidebarProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortByFavorite, setSortByFavorite] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const { data: favoriteChannels = [], isLoading: isLoadingFavorites } = useFavoriteChannels();
  const { data: favoriteVideos = [] } = useFavoriteYouTubeVideos();
  const { data: watchlistVideos = [] } = useYouTubeVideoWatchlist();
  const { data: recommendations } = useYouTubeRecommendations();
  const { data: allChannels = [], isLoading: isLoadingChannels } = useYouTubeChannels();

  // Combine all channels and filter/search
  const filteredChannels = useMemo(() => {
    let channels = allChannels;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      channels = channels.filter(
        (channel) =>
          channel.title?.toLowerCase().includes(query) ||
          channel.id.toLowerCase().includes(query)
      );
    }

    // Sort by favorite if enabled
    if (sortByFavorite) {
      const favoriteIds = new Set(favoriteChannels.map((fc) => fc.channelId));
      channels = [...channels].sort((a, b) => {
        const aIsFavorite = favoriteIds.has(a.id);
        const bIsFavorite = favoriteIds.has(b.id);
        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
        return 0;
      });
    }

    return channels;
  }, [allChannels, searchQuery, sortByFavorite, favoriteChannels]);

  const handleChannelClick = (channelId: string, slug?: string | null) => {
    router.push(getChannelProfilePath(channelId, slug));
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Top Actions */}
      <div className="p-4 space-y-2 border-b">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={() => {
            router.push("/dashboard/youtube");
            if (isMobile) setIsOpen(false);
          }}
        >
          <Heart className="h-4 w-4" />
          <span>Favorites</span>
          {favoriteVideos.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{favoriteVideos.length}</span>
          )}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={() => {
            router.push("/dashboard/youtube");
            if (isMobile) setIsOpen(false);
          }}
        >
          <Bookmark className="h-4 w-4" />
          <span>Watch Later</span>
          {watchlistVideos.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{watchlistVideos.length}</span>
          )}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={() => {
            router.push("/dashboard/youtube");
            if (isMobile) setIsOpen(false);
          }}
        >
          <Sparkles className="h-4 w-4" />
          <span>Recommendations</span>
          {recommendations?.recommendedVideos.length ? (
            <span className="ml-auto text-xs text-muted-foreground">
              {recommendations.recommendedVideos.length}
            </span>
          ) : null}
        </Button>
      </div>

      {/* Search and Sort */}
      <div className="p-4 space-y-2 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button
          variant={sortByFavorite ? "default" : "outline"}
          size="sm"
          className="w-full"
          onClick={() => setSortByFavorite(!sortByFavorite)}
        >
          <Heart className={cn("h-3 w-3 mr-2", sortByFavorite && "fill-current")} />
          Sort by Favorite
        </Button>
      </div>

      {/* Channels List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoadingChannels || isLoadingFavorites ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery ? "No channels found" : "No channels available"}
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const isFavorite = favoriteChannels.some((fc) => fc.channelId === channel.id);
              const isActive = currentChannelId === channel.id;

              return (
                <button
                  key={channel.id}
                  onClick={() => handleChannelClick(channel.id, channel.slug)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                    "hover:bg-muted",
                    isActive && "bg-muted border-l-2 border-primary"
                  )}
                >
                  <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {channel.thumbnail ? (
                      <Image
                        src={channel.thumbnail}
                        alt={channel.title || "Channel"}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Youtube className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{channel.title || "Channel"}</p>
                    {isFavorite && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Heart className="h-3 w-3 text-red-500 fill-red-500" />
                        <span className="text-xs text-muted-foreground">Favorite</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg">
            <Youtube className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="w-64 border-r bg-card flex-shrink-0 hidden lg:flex flex-col h-[calc(100vh-65px)] sticky top-[65px]">
      {sidebarContent}
    </aside>
  );
}

