"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Heart, Bookmark, Sparkles, Youtube, X, ChevronLeft, ChevronRight, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useFavoriteChannels } from "@/hooks/use-favorite-channels";
import { useFavoriteYouTubeVideos } from "@/hooks/use-favorite-youtube-videos";
import { useYouTubeVideoWatchlist } from "@/hooks/use-youtube-video-watchlist";
import { useYouTubeRecommendations } from "@/hooks/use-youtube-recommendations";
import { useYouTubeChannels } from "@/hooks/use-youtube-channels";
import { getChannelProfilePath } from "@/lib/channel-path";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface YouTubeChannelSidebarProps {
  currentChannelId?: string;
  activeTab?: "channel" | "favorites" | "watchlater" | "recommendations";
  onTabChange?: (tab: "channel" | "favorites" | "watchlater" | "recommendations") => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function YouTubeChannelSidebar({ 
  currentChannelId, 
  activeTab = "channel",
  onTabChange,
  mobileOpen,
  onMobileOpenChange
}: YouTubeChannelSidebarProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBy, setFilterBy] = useState<"all" | "favorites">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"default" | "alphabetical-az" | "alphabetical-za">("default");
  const [internalOpen, setInternalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch channel categories
  const { data: channelCategoriesData } = useQuery({
    queryKey: ["youtube-channel-categories"],
    queryFn: async () => {
      const response = await fetch("/api/youtube/channels/categories");
      if (!response.ok) return null;
      return response.json() as Promise<{
        channelCategories: Record<string, string[]>;
        availableCategories: string[];
      }>;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = mobileOpen !== undefined ? mobileOpen : internalOpen;
  const setIsOpen = onMobileOpenChange || setInternalOpen;

  const { data: favoriteChannels = [], isLoading: isLoadingFavorites } = useFavoriteChannels();
  const { data: favoriteVideos = [] } = useFavoriteYouTubeVideos();
  const { data: watchlistVideos = [] } = useYouTubeVideoWatchlist();
  const { data: recommendations } = useYouTubeRecommendations();
  const { data: allChannels = [], isLoading: isLoadingChannels } = useYouTubeChannels();

  // Combine all channels and filter/search
  const filteredChannels = useMemo(() => {
    let channels = allChannels;
    const favoriteIds = new Set(favoriteChannels.map((fc) => fc.channelId));

    // Filter by favorites
    if (filterBy === "favorites") {
      channels = channels.filter((channel) => favoriteIds.has(channel.id));
    }

    // Filter by category
    if (categoryFilter !== "all" && channelCategoriesData?.channelCategories) {
      channels = channels.filter((channel) => {
        const channelCats = channelCategoriesData.channelCategories[channel.id] || [];
        return channelCats.includes(categoryFilter);
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      channels = channels.filter(
        (channel) =>
          channel.title?.toLowerCase().includes(query) ||
          channel.id.toLowerCase().includes(query)
      );
    }

    // Sort channels
    if (sortBy === "alphabetical-az") {
      channels = [...channels].sort((a, b) => {
        const aTitle = (a.title || "").toLowerCase();
        const bTitle = (b.title || "").toLowerCase();
        return aTitle.localeCompare(bTitle);
      });
    } else if (sortBy === "alphabetical-za") {
      channels = [...channels].sort((a, b) => {
        const aTitle = (a.title || "").toLowerCase();
        const bTitle = (b.title || "").toLowerCase();
        return bTitle.localeCompare(aTitle);
      });
    } else if (sortBy === "default") {
      // Sort favorites first, then alphabetical
      channels = [...channels].sort((a, b) => {
        const aIsFavorite = favoriteIds.has(a.id);
        const bIsFavorite = favoriteIds.has(b.id);
        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
        // If both are favorites or both are not, sort alphabetically
        const aTitle = (a.title || "").toLowerCase();
        const bTitle = (b.title || "").toLowerCase();
        return aTitle.localeCompare(bTitle);
      });
    }

    return channels;
  }, [allChannels, searchQuery, filterBy, categoryFilter, sortBy, favoriteChannels, channelCategoriesData]);

  const handleChannelClick = (channelId: string, slug?: string | null) => {
    router.push(getChannelProfilePath(channelId, slug));
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Mobile Close Button */}
      {isMobile && (
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">Channels</h2>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
      )}
      
      {/* Collapse Button - Reddit style at top (desktop only) */}
      {!isMobile && (
        <div className={cn(
          "p-2 border-b flex items-center transition-all",
          isCollapsed ? "justify-center" : "justify-end"
        )}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                isCollapsed && "mx-auto"
              )}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
      </div>
      )}

      {/* Top Actions - Reddit style: icon-only when collapsed */}
      <div className={cn(
        "border-b transition-all",
        isCollapsed ? "p-2 space-y-1" : "p-4 space-y-2"
      )}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTab === "favorites" ? "secondary" : "ghost"}
              className={cn(
                "w-full transition-all",
                isCollapsed ? "justify-center p-2" : "justify-start gap-3"
              )}
              onClick={() => {
                onTabChange?.("favorites");
                if (isMobile) setIsOpen(false);
              }}
            >
              <Heart className="h-4 w-4" />
              {!isCollapsed && (
                <>
                  <span>Favorites</span>
                  {favoriteVideos.length > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">{favoriteVideos.length}</span>
                  )}
                </>
              )}
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">
              <div className="flex items-center gap-2">
                <span>Favorites</span>
                {favoriteVideos.length > 0 && (
                  <span className="text-xs text-muted-foreground">({favoriteVideos.length})</span>
                )}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTab === "watchlater" ? "secondary" : "ghost"}
              className={cn(
                "w-full transition-all",
                isCollapsed ? "justify-center p-2" : "justify-start gap-3"
              )}
              onClick={() => {
                onTabChange?.("watchlater");
                if (isMobile) setIsOpen(false);
              }}
            >
              <Bookmark className="h-4 w-4" />
              {!isCollapsed && (
                <>
                  <span>Watch Later</span>
                  {watchlistVideos.length > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">{watchlistVideos.length}</span>
                  )}
                </>
              )}
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">
              <div className="flex items-center gap-2">
                <span>Watch Later</span>
                {watchlistVideos.length > 0 && (
                  <span className="text-xs text-muted-foreground">({watchlistVideos.length})</span>
                )}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTab === "recommendations" ? "secondary" : "ghost"}
              className={cn(
                "w-full transition-all",
                isCollapsed ? "justify-center p-2" : "justify-start gap-3"
              )}
              onClick={() => {
                onTabChange?.("recommendations");
                if (isMobile) setIsOpen(false);
              }}
            >
              <Sparkles className="h-4 w-4" />
              {!isCollapsed && (
                <span>Recommendations</span>
              )}
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">
              <span>Recommendations</span>
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Search with Filter/Sort Icons - Hidden when collapsed */}
      {!isCollapsed && (
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-24"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0">
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              
              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 cursor-pointer",
                      sortBy !== "default" && "bg-primary/10 text-primary"
                    )}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setSortBy("default")}
                    className={cn(
                      "cursor-pointer",
                      sortBy === "default" && "bg-accent"
                    )}
                  >
                    Default (Favorites First)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy("alphabetical-az")}
                    className={cn(
                      "cursor-pointer",
                      sortBy === "alphabetical-az" && "bg-accent"
                    )}
                  >
                    Alphabetical (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy("alphabetical-za")}
                    className={cn(
                      "cursor-pointer",
                      sortBy === "alphabetical-za" && "bg-accent"
                    )}
                  >
                    Alphabetical (Z-A)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 cursor-pointer",
                      (filterBy !== "all" || categoryFilter !== "all") && "bg-primary/10 text-primary"
                    )}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setFilterBy("all")}
                    className={cn(
                      "cursor-pointer",
                      filterBy === "all" && "bg-accent"
                    )}
                  >
                    All Channels
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterBy("favorites")}
                    className={cn(
                      "cursor-pointer",
                      filterBy === "favorites" && "bg-accent"
                    )}
                  >
                    Favorites Only
                  </DropdownMenuItem>
                  {channelCategoriesData?.availableCategories && channelCategoriesData.availableCategories.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Category</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setCategoryFilter("all")}
                        className={cn(
                          "cursor-pointer",
                          categoryFilter === "all" && "bg-accent"
                        )}
                      >
                        All Categories
                      </DropdownMenuItem>
                      {channelCategoriesData.availableCategories.map((category) => (
                        <DropdownMenuItem
                          key={category}
                          onClick={() => setCategoryFilter(category)}
                          className={cn(
                            "cursor-pointer",
                            categoryFilter === category && "bg-accent"
                          )}
                        >
                          {category}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      {/* Channels List */}
      <ScrollArea className="min-h-0">
        <div className={cn("space-y-1", isCollapsed ? "p-1" : "p-2")}>
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

              const channelButton = (
                <button
                  onClick={() => handleChannelClick(channel.id, channel.slug)}
                  className={cn(
                    "w-full flex items-center rounded-md text-left transition-colors",
                    isCollapsed ? "justify-center p-2" : "gap-3 p-2",
                    "hover:bg-muted",
                    isActive && "bg-muted",
                    !isCollapsed && isActive && "border-l-2 border-primary"
                  )}
                >
                  <div className={cn(
                    "relative rounded-full overflow-hidden bg-muted flex-shrink-0",
                    isCollapsed ? "h-8 w-8" : "h-10 w-10"
                  )}>
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
                        <Youtube className={cn(
                          "text-muted-foreground",
                          isCollapsed ? "h-4 w-4" : "h-5 w-5"
                        )} />
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{channel.title || "Channel"}</p>
                      {isFavorite && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Heart className="h-3 w-3 text-red-500 fill-red-500" />
                          <span className="text-xs text-muted-foreground">Favorite</span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={channel.id}>
                    <TooltipTrigger asChild>
                      {channelButton}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{channel.title || "Channel"}</span>
                        {isFavorite && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
                            Favorite
                          </span>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={channel.id}>{channelButton}</div>;
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 [&>button]:hidden">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside 
      className={cn(
        "border-r bg-card flex-shrink-0 hidden lg:flex flex-col fixed top-16 bottom-0 z-40 transition-all duration-200 ease-in-out",
        isCollapsed ? "w-12" : "w-64"
      )}
    >
      {sidebarContent}
    </aside>
  );
}

