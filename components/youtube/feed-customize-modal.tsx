"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, X, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

interface Channel {
  id?: string; // For YouTube search results
  channelId: string; // For app pool channels, this is the key field
  title?: string;
  thumbnail?: string;
  channelUrl?: string;
  slug?: string | null;
}

interface FeedCustomizeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FilterType = "all" | "selected" | "unselected";
type SearchSource = "app" | "youtube";

export function FeedCustomizeModal({ open, onOpenChange }: FeedCustomizeModalProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchSource, setSearchSource] = useState<SearchSource>("app");
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Channel[]>([]);

  // Fetch all channels from app pool
  const { data: appChannelsData, isLoading: isLoadingAppChannels } = useQuery({
    queryKey: ["youtube-channels-all"],
    queryFn: async () => {
      const response = await fetch("/api/youtube/channels/all?limit=1000");
      if (!response.ok) return { channels: [] };
      const data = await response.json();
      return { channels: data.channels || [] };
    },
    enabled: open && searchSource === "app",
  });

  // Fetch user's feed channels
  const { data: feedChannelsData, isLoading: isLoadingFeedChannels } = useQuery({
    queryKey: ["feed-channels"],
    queryFn: async () => {
      const response = await fetch("/api/youtube/channels/pool");
      if (!response.ok) return { channels: [] };
      const data = await response.json();
      return { channels: data.channels || [] };
    },
    enabled: open,
  });

  // Initialize selected channels when feed channels load
  useEffect(() => {
    if (feedChannelsData?.channels) {
      setSelectedChannelIds(feedChannelsData.channels.map((c: any) => c.channelId));
    }
  }, [feedChannelsData]);

  // Search channels from YouTube
  const searchYouTubeChannels = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/youtube/channels/search?q=${encodeURIComponent(query)}&maxResults=20`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.channels || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to search channels");
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching YouTube channels:", error);
      toast.error("An error occurred while searching");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search query change
  useEffect(() => {
    if (searchSource === "youtube" && searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchYouTubeChannels(searchQuery);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else if (searchSource === "app") {
      setSearchResults([]);
    }
  }, [searchQuery, searchSource]);

  // Save feed preferences mutation
  const saveFeedPreferences = useMutation({
    mutationFn: async (channelIds: string[]) => {
      // Get current feed channel IDs
      const currentFeedChannelIds = new Set<string>(
        (feedChannelsData?.channels || []).map((c: any) => c.channelId)
      );
      
      // Determine which channels to add and remove
      const channelsToAdd = channelIds.filter((id) => !currentFeedChannelIds.has(id));
      const channelsToRemove = Array.from<string>(currentFeedChannelIds).filter(
        (id) => !channelIds.includes(id)
      );

      // Remove channels from feed
      for (const channelId of channelsToRemove) {
        try {
          await fetch("/api/youtube/channels/pool", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channelId, action: "remove" }),
          });
        } catch (error) {
          console.error("Error removing channel:", error);
        }
      }

      // Add channels to feed (and app pool if needed)
      for (const channelId of channelsToAdd) {
        try {
          // First, ensure channel exists in app pool and add to user feed
          const addResponse = await fetch("/api/youtube/channels/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channelId, addToUserPool: true }),
          });

          if (!addResponse.ok) {
            const errorData = await addResponse.json().catch(() => ({}));
            // If channel already exists in pool, just add to feed
            if (addResponse.status !== 404) {
              // Try adding directly to feed via pool endpoint
              await fetch("/api/youtube/channels/pool", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channelId, action: "add" }),
              });
            } else {
              console.error("Error adding channel to pool:", errorData);
            }
          }
        } catch (error) {
          console.error("Error adding channel:", error);
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-channels"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-channels-all"] });
      toast.success("Feed preferences saved");
      setIsSaving(false);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save feed preferences");
      setIsSaving(false);
    },
  });

  const appChannels = appChannelsData?.channels || [];
  const feedChannels = feedChannelsData?.channels || [];
  const isLoading = isLoadingAppChannels || isLoadingFeedChannels;

  // Get channels to display based on search source
  // Normalize channel format: YouTube results have `id`, app pool has `channelId`
  const availableChannels = useMemo(() => {
    if (searchSource === "youtube") {
      return searchResults.map((ch) => ({
        ...ch,
        channelId: ch.id || ch.channelId, // Normalize: use `id` if present, otherwise `channelId`
      }));
    } else {
      return appChannels.map((ch: any) => ({
        ...ch,
        channelId: ch.channelId, // App pool already has channelId
      }));
    }
  }, [searchSource, searchResults, appChannels]);

  // Filter channels based on search and filter type
  const filteredChannels = useMemo(() => {
    let filtered = availableChannels;

    // Apply search filter (only for app pool, YouTube search is handled separately)
    if (searchSource === "app" && searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((channel: Channel) =>
        channel.title?.toLowerCase().includes(query) ||
        channel.channelId.toLowerCase().includes(query)
      );
    }

    // Apply filter type
    if (filterType === "selected") {
      filtered = filtered.filter((channel: Channel) =>
        selectedChannelIds.includes(channel.channelId)
      );
    } else if (filterType === "unselected") {
      filtered = filtered.filter((channel: Channel) =>
        !selectedChannelIds.includes(channel.channelId)
      );
    }

    return filtered;
  }, [availableChannels, searchQuery, filterType, selectedChannelIds, searchSource]);

  const handleToggleChannel = (channelId: string) => {
    setSelectedChannelIds((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleSave = () => {
    setIsSaving(true);
    saveFeedPreferences.mutate(selectedChannelIds);
  };

  const handleReset = () => {
    // Reset to empty feed
    setSelectedChannelIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!isSaving) {
        onOpenChange(newOpen);
      }
    }}>
      <DialogContent className="sm:max-w-[40rem] h-[90vh] flex flex-col p-0">
        {/* Fixed Header */}
        <DialogHeader className="px-4 sm:px-6 py-4 border-b flex-shrink-0">
          <DialogTitle>Customize Your Feed</DialogTitle>
          <DialogDescription>
            Select which channels you want to see in your feed. You can search from the app pool or YouTube directly.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-4">
          {/* Search and Filter */}
          <div className="flex flex-row items-stretch sm:items-center gap-3 mb-6">
            {/* Search Source Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-auto cursor-pointer">
                  {searchSource === "app" ? "App Pool" : "YouTube"}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    setSearchSource("app");
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className={cn(
                    "cursor-pointer",
                    searchSource === "app" && "bg-accent"
                  )}
                >
                  App Pool
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSearchSource("youtube");
                    setSearchQuery("");
                  }}
                  className={cn(
                    "cursor-pointer",
                    searchSource === "youtube" && "bg-accent"
                  )}
                >
                  YouTube
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search - takes most space */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchSource === "app" ? "Search app pool..." : "Search YouTube..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-auto cursor-pointer"
                >
                  {filterType === "all" && "All"}
                  {filterType === "selected" && `Selected (${selectedChannelIds.length})`}
                  {filterType === "unselected" && `Unselected (${availableChannels.length - selectedChannelIds.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="flex flex-col gap-1">
                  <DropdownMenuItem
                    onClick={() => setFilterType("all")}
                    className={cn(
                      "cursor-pointer",
                      filterType === "all" && "bg-accent"
                    )}
                  >
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterType("selected")}
                    className={cn(
                      "cursor-pointer",
                      filterType === "selected" && "bg-accent"
                    )}
                  >
                    Selected ({selectedChannelIds.length})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterType("unselected")}
                    className={cn(
                      "cursor-pointer",
                      filterType === "unselected" && "bg-accent"
                    )}
                  >
                    Unselected ({availableChannels.length - selectedChannelIds.length})
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Channels List */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : searchSource === "youtube" && !searchQuery.trim() ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Enter a search query to find channels on YouTube</p>
            </div>
          ) : isSearching ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No channels found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredChannels.map((channel: Channel) => {
                const isSelected = selectedChannelIds.includes(channel.channelId);
                return (
                  <div
                    key={channel.channelId}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      isSelected && "bg-accent/50",
                      "hover:bg-accent/30"
                    )}
                  >
                    {/* Channel Thumbnail */}
                    <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
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
                          <Youtube className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Channel Content */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium line-clamp-1">{channel.title || "Channel"}</div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {channel.channelId}
                      </p>
                    </div>

                    {/* Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleChannel(channel.channelId)}
                      className="flex-shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="px-4 sm:px-6 py-4 border-t flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSaving || selectedChannelIds.length === 0}
            >
              Clear Feed
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

