"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, X, GripVertical, Search, Loader2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChannelListItemPayload,
  YouTubeChannelList,
  useCreateYouTubeChannelList,
  useUpdateYouTubeChannelList,
} from "@/hooks/use-youtube-channel-lists";
import { YouTubeChannel } from "@/hooks/use-youtube-channels";
import { toast } from "sonner";
import { extractChannelIdFromUrl } from "@/lib/youtube-channels";
import { useQueryClient } from "@tanstack/react-query";

interface ChannelListBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: YouTubeChannelList | null;
  availableChannels?: YouTubeChannel[]; // Optional, kept for backward compatibility but not used
  onCompleted?: (list: YouTubeChannelList) => void;
}

interface SelectedChannel extends ChannelListItemPayload {
  channelTitle: string;
  channelThumbnail?: string | null;
}

export function ChannelListBuilder({
  isOpen,
  onClose,
  initialData,
  onCompleted,
}: ChannelListBuilderProps) {
  // availableChannels prop is kept for backward compatibility but not used
  // Channels are now added via the channel extractor/search
  const createList = useCreateYouTubeChannelList();
  const updateList = useUpdateYouTubeChannelList();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [channelSearchInput, setChannelSearchInput] = useState("");
  const [isSearchingChannels, setIsSearchingChannels] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    title: string;
    thumbnail?: string;
    channelUrl: string;
    subscriberCount?: string;
    videoCount?: string;
  }>>([]);
  const [selectedChannels, setSelectedChannels] = useState<SelectedChannel[]>([]);
  const [pendingChannel, setPendingChannel] = useState<{
    id: string;
    title: string;
    thumbnail?: string;
    channelUrl: string;
    subscriberCount?: string;
    videoCount?: string;
  } | null>(null);
  const [addToUserPool, setAddToUserPool] = useState(false);
  const [isAddingChannel, setIsAddingChannel] = useState(false);

  // Format count helper
  const formatCount = (count: string | number | null | undefined): string => {
    if (!count) return "0";
    const num = typeof count === "string" ? parseInt(count, 10) : count;
    if (isNaN(num)) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const mode: "create" | "edit" = initialData ? "edit" : "create";
  const isSubmitting = createList.isPending || updateList.isPending;

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description ?? "");
      setIsPublic(initialData.isPublic);
      setTags(initialData.tags ?? []);
      setSelectedChannels(
        initialData.items
          .sort((a, b) => a.position - b.position)
          .map((item) => ({
            channelId: item.channelId,
            channelTitle: item.channelTitle ?? "Channel",
            channelThumbnail: item.channelThumbnail ?? undefined,
            channelDescription: item.channelDescription ?? undefined,
            subscriberCount: item.subscriberCount ?? undefined,
            videoCount: item.videoCount ?? undefined,
            channelUrl: item.channelUrl ?? undefined,
            notes: item.notes ?? undefined,
            position: item.position,
          }))
      );
    } else {
      setName("");
      setDescription("");
      setIsPublic(true);
      setTagInput("");
      setTags([]);
      setChannelSearchInput("");
      setSearchResults([]);
      setSelectedChannels([]);
    }
  }, [isOpen, initialData]);

  const handleSearchChannels = async () => {
    if (!channelSearchInput.trim()) {
      toast.error("Please enter a channel name or URL");
      return;
    }

    setIsSearchingChannels(true);
    setSearchResults([]);

    try {
      const isUrl = channelSearchInput.includes("youtube.com") || channelSearchInput.includes("youtu.be");
      
      if (isUrl) {
        const channelId = extractChannelIdFromUrl(channelSearchInput);
        if (channelId) {
          const response = await fetch(`/api/youtube/channels?channelIds=${encodeURIComponent(channelId)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.channels && data.channels.length > 0) {
              setSearchResults(data.channels);
            } else {
              toast.error("Channel not found. Please check the URL.");
            }
          } else {
            toast.error("Failed to fetch channel information.");
          }
        } else {
          // Try search
          const searchTerm = channelSearchInput.split("/").pop() || channelSearchInput;
          await performChannelSearch(searchTerm);
        }
      } else {
        await performChannelSearch(channelSearchInput);
      }
    } catch (err) {
      console.error("Error searching channels:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSearchingChannels(false);
    }
  };

  const performChannelSearch = async (query: string) => {
    try {
      const response = await fetch(`/api/youtube/channels/search?q=${encodeURIComponent(query)}&maxResults=10`);
      if (response.ok) {
        const data = await response.json();
        if (data.channels && data.channels.length > 0) {
          setSearchResults(data.channels);
        } else {
          toast.error("No channels found. Try a different search term.");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to search for channels.");
      }
    } catch (err) {
      console.error("Error searching channels:", err);
      toast.error("An error occurred while searching. Please try again.");
    }
  };

  const handleAddChannel = async (channel: {
    id: string;
    title: string;
    thumbnail?: string;
    channelUrl: string;
    subscriberCount?: string;
    videoCount?: string;
  }) => {
    if (selectedChannels.some((item) => item.channelId === channel.id)) {
      toast.info("Channel already added to list");
      return;
    }

    // Check if channel exists in app pool
    try {
      const checkResponse = await fetch(`/api/youtube/channels/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelIds: [channel.id] }),
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        const existsInAppPool = checkData.existingIds?.includes(channel.id);

        if (!existsInAppPool) {
          // Channel not in app pool - show dialog
          setPendingChannel(channel);
          setAddToUserPool(false);
          return;
        }
      }
    } catch (error) {
      console.error("Error checking channel existence:", error);
      // Continue with adding to list even if check fails
    }

    // Channel exists in app pool or check failed - add directly to list
    setSelectedChannels((prev) => [
      ...prev,
      {
        channelId: channel.id,
        channelTitle: channel.title,
        channelThumbnail: channel.thumbnail,
        channelDescription: undefined,
        subscriberCount: channel.subscriberCount ?? null,
        videoCount: channel.videoCount ?? null,
        channelUrl: channel.channelUrl,
        notes: "",
      },
    ]);
    toast.success("Channel added to list");
  };

  const handleConfirmAddChannel = async () => {
    if (!pendingChannel) return;

    setIsAddingChannel(true);
    const loadingToast = toast.loading("Adding channel to app pool...");
    
    try {
      // Add channel to app pool (and optionally to user pool)
      const response = await fetch("/api/youtube/channels/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: pendingChannel.id,
          addToUserPool: addToUserPool,
        }),
      });

      if (response.ok) {
        // Invalidate channels query to update UI (so "Add to My Feed" button updates)
        await queryClient.invalidateQueries({ queryKey: ["youtube-channels-all"] });
        
        // Now add to list
        setSelectedChannels((prev) => [
          ...prev,
          {
            channelId: pendingChannel.id,
            channelTitle: pendingChannel.title,
            channelThumbnail: pendingChannel.thumbnail,
            channelDescription: undefined,
            subscriberCount: pendingChannel.subscriberCount ?? null,
            videoCount: pendingChannel.videoCount ?? null,
            channelUrl: pendingChannel.channelUrl,
            notes: "",
          },
        ]);
        
        toast.dismiss(loadingToast);
        toast.success(
          addToUserPool
            ? "Channel added to app pool and your feed, and added to list"
            : "Channel added to app pool and added to list"
        );
        setPendingChannel(null);
        setAddToUserPool(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.dismiss(loadingToast);
        toast.error(errorData.error || "Failed to add channel");
      }
    } catch (error) {
      console.error("Error adding channel:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to add channel. Please try again.");
    } finally {
      setIsAddingChannel(false);
    }
  };

  const handleRemoveChannel = (channelId: string) => {
    setSelectedChannels((prev) => prev.filter((item) => item.channelId !== channelId));
  };

  const handleReorder = (index: number, direction: "up" | "down") => {
    setSelectedChannels((prev) => {
      const newList = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newList.length) return prev;
      [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
      return newList;
    });
  };

  const handleAddTag = () => {
    const cleaned = tagInput.trim();
    if (!cleaned) return;
    if (tags.includes(cleaned)) {
      setTagInput("");
      return;
    }
    if (tags.length >= 8) {
      toast.error("Too many tags. You can add up to 8 tags per list.");
      return;
    }
    setTags((prev) => [...prev, cleaned]);
    setTagInput("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("List name required. Give your list a memorable name.");
      return;
    }
    if (selectedChannels.length === 0) {
      toast.error("Add channels. Select at least one channel to share.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      isPublic,
      tags,
      channels: selectedChannels.map((channel, index) => ({
        ...channel,
        position: index + 1,
      })),
    };

    try {
      const list =
        mode === "create"
          ? await createList.mutateAsync(payload)
          : await updateList.mutateAsync({ listId: initialData!.id, ...payload });
      toast.success(mode === "create" ? "List published. Your channel list is ready to share." : "List updated. Your channel list is ready to share.");
      onCompleted?.(list);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save list. Something went wrong.");
    }
  };

  const availableWithoutSelection = searchResults.filter(
    (channel) => !selectedChannels.some((item) => item.channelId === channel.id)
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[600px] lg:w-[800px] flex flex-col p-0">
        {/* Fixed Header */}
        <div className="flex items-center gap-4 border-b border-border p-4 flex-shrink-0">
          <div className="flex-1">
            <h2 className="text-xl font-bold">{mode === "create" ? "Create a channel list" : "Edit list"}</h2>
            <p className="text-sm text-muted-foreground">Curate and share your favorite YouTube channels</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <form id="channel-list-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="channel-list-name">List name</Label>
              <Input
                id="channel-list-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Top tech storytellers, cozy creators..."
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-list-description">Description</Label>
              <Textarea
                id="channel-list-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell everyone why these channels made the cut."
                rows={4}
                maxLength={500}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Public list</p>
                  <p className="text-xs text-muted-foreground">
                    Anyone can view and follow this list.
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1 rounded-full px-3 py-0.5 text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((item) => item !== tag))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {tags.length < 8 && (
                  <div className="flex items-center gap-2 rounded-full border border-dashed border-border px-3 py-0.5">
                    <Input
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === ",") {
                          event.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Add tag"
                      className="h-7 w-28 border-none bg-transparent px-2 text-xs focus-visible:ring-0"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={handleAddTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Selected channels</Label>
                {selectedChannels.length > 1 && (
                  <span className="text-xs text-muted-foreground">
                    Use arrows to reorder.
                  </span>
                )}
              </div>
              {selectedChannels.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No channels added yet. Search and add channels below.
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin rounded-lg border border-border p-3">
                  {selectedChannels.map((channel, index) => (
                    <div key={channel.channelId} className="flex gap-3 p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleReorder(index, "up")}
                          disabled={index === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                        >
                          ↑
                        </button>
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                        <button
                          type="button"
                          onClick={() => handleReorder(index, "down")}
                          disabled={index === selectedChannels.length - 1}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                        >
                          ↓
                        </button>
                      </div>
                      <div className="flex flex-1 gap-3">
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                          {channel.channelThumbnail ? (
                            <Image
                              src={channel.channelThumbnail}
                              alt={channel.channelTitle}
                              fill
                              className="object-cover"
                              sizes="48px"
                              unoptimized
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                              {channel.channelTitle.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{channel.channelTitle}</p>
                              <p className="text-xs text-muted-foreground">
                                {channel.subscriberCount
                                  ? `${formatCount(channel.subscriberCount)} subscribers`
                                  : "Subscriber info unavailable"}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={() => handleRemoveChannel(channel.channelId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <Textarea
                            placeholder="Add notes..."
                            value={channel.notes ?? ""}
                            onChange={(event) =>
                              setSelectedChannels((prev) =>
                                prev.map((item, idx) =>
                                  idx === index ? { ...item, notes: event.target.value } : item
                                )
                              )
                            }
                            rows={2}
                            className="text-xs rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <div className="space-y-2">
                <Label htmlFor="channel-search">Add channels</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="channel-search"
                      value={channelSearchInput}
                      onChange={(event) => setChannelSearchInput(event.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSearchChannels();
                        }
                      }}
                      placeholder="Search by name or paste YouTube URL..."
                      className="pl-9 rounded-lg"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSearchChannels}
                    disabled={isSearchingChannels || !channelSearchInput.trim()}
                    className="rounded-lg"
                  >
                    {isSearchingChannels ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Search for any YouTube channel by name or paste a channel URL.
                </p>
              </div>
              {searchResults.length > 0 && (
                <div className="max-h-[300px] overflow-y-auto scrollbar-thin space-y-3">
                  {availableWithoutSelection.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground text-center">
                      All search results have been added to the list.
                    </div>
                  ) : (
                    availableWithoutSelection.map((channel) => (
                      <div
                        key={channel.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-background/60 p-3"
                      >
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-border bg-muted flex-shrink-0">
                          {channel.thumbnail ? (
                            <Image
                              src={channel.thumbnail}
                              alt={channel.title}
                              fill
                              className="object-cover"
                              sizes="48px"
                              unoptimized
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                              {channel.title.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold line-clamp-1">{channel.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {channel.subscriberCount
                              ? `${formatCount(channel.subscriberCount)} subscribers`
                              : "Subscriber count unavailable"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 flex-shrink-0 rounded-lg"
                          onClick={() => handleAddChannel(channel)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="border-t border-border p-4 space-y-2 flex-shrink-0">
          <Button type="submit" form="channel-list-form" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : mode === "create" ? "Publish list" : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </SheetContent>

      {/* Dialog for adding new channel to app pool */}
      <AlertDialog open={!!pendingChannel} onOpenChange={(open) => !open && setPendingChannel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Channel to App Pool</AlertDialogTitle>
            <AlertDialogDescription>
              This channel is not in the app pool yet. It will be added to the app pool so others can discover it.
              {pendingChannel && (
                <div className="mt-4 flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  {pendingChannel.thumbnail && (
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-border bg-muted flex-shrink-0">
                      <Image
                        src={pendingChannel.thumbnail}
                        alt={pendingChannel.title}
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-1">{pendingChannel.title}</p>
                    {pendingChannel.subscriberCount && (
                      <p className="text-xs text-muted-foreground">
                        {formatCount(pendingChannel.subscriberCount)} subscribers
                      </p>
                    )}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex-1">
                <p className="text-sm font-medium">Add to My Feed</p>
                <p className="text-xs text-muted-foreground">
                  Also add this channel to your personal feed so you can see it on your dashboard.
                </p>
              </div>
              <Switch checked={addToUserPool} onCheckedChange={setAddToUserPool} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAddingChannel} className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAddChannel}
              disabled={isAddingChannel}
              className="cursor-pointer"
            >
              {isAddingChannel ? "Adding..." : "Add Channel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

