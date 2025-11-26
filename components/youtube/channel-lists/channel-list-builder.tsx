"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Minus, Search, X, GripVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChannelListItemPayload,
  YouTubeChannelList,
  useCreateYouTubeChannelList,
  useUpdateYouTubeChannelList,
} from "@/hooks/use-youtube-channel-lists";
import { YouTubeChannel } from "@/hooks/use-youtube-channels";
import { toast } from "sonner";

interface ChannelListBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: YouTubeChannelList | null;
  availableChannels: YouTubeChannel[];
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
  availableChannels,
  onCompleted,
}: ChannelListBuilderProps) {
  const createList = useCreateYouTubeChannelList();
  const updateList = useUpdateYouTubeChannelList();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [coverImage, setCoverImage] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<SelectedChannel[]>([]);

  const mode: "create" | "edit" = initialData ? "edit" : "create";
  const isSubmitting = createList.isPending || updateList.isPending;

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description ?? "");
      setIsPublic(initialData.isPublic);
      setCoverImage(initialData.coverImage ?? "");
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
      setCoverImage("");
      setTagInput("");
      setTags([]);
      setSelectedChannels([]);
    }
  }, [isOpen, initialData]);

  const filteredAvailableChannels = useMemo(() => {
    if (!availableChannels?.length) return [];
    const term = search.toLowerCase();
    return availableChannels.filter((channel) => {
      if (!term) return true;
      return channel.title.toLowerCase().includes(term) || channel.channelUrl?.toLowerCase().includes(term);
    });
  }, [availableChannels, search]);

  const handleAddChannel = (channel: YouTubeChannel) => {
    if (selectedChannels.some((item) => item.channelId === channel.id)) return;
    setSelectedChannels((prev) => [
      ...prev,
      {
        channelId: channel.id,
        channelTitle: channel.title,
        channelThumbnail: channel.thumbnail,
        channelDescription: channel.description,
        subscriberCount: channel.subscriberCount ?? null,
        videoCount: channel.videoCount ?? null,
        channelUrl: channel.channelUrl,
        notes: "",
      },
    ]);
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
      toast({
        title: "Too many tags",
        description: "You can add up to 8 tags per list.",
      });
      return;
    }
    setTags((prev) => [...prev, cleaned]);
    setTagInput("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast({
        title: "List name required",
        description: "Give your list a memorable name.",
        variant: "destructive",
      });
      return;
    }
    if (selectedChannels.length === 0) {
      toast({
        title: "Add channels",
        description: "Select at least one channel to share.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      isPublic,
      tags,
      coverImage: coverImage.trim() || undefined,
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
      toast({
        title: mode === "create" ? "List published" : "List updated",
        description: "Your channel list is ready to share.",
      });
      onCompleted?.(list);
      onClose();
    } catch (error) {
      toast({
        title: "Unable to save list",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const availableWithoutSelection = filteredAvailableChannels.filter(
    (channel) => !selectedChannels.some((item) => item.channelId === channel.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-5xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{mode === "create" ? "Create a channel list" : "Edit list"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 px-6 pb-6 lg:grid-cols-[1.3fr,0.7fr]">
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
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="flex items-center justify-between rounded-2xl border border-border p-3">
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
                <Label htmlFor="channel-list-cover">Cover image URL (optional)</Label>
                <Input
                  id="channel-list-cover"
                  value={coverImage}
                  onChange={(event) => setCoverImage(event.target.value)}
                  placeholder="https://images..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1 rounded-full px-3 py-1 text-xs"
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
                  <div className="flex items-center gap-2 rounded-full border border-dashed border-border px-3 py-1">
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
                      className="h-7 w-28 border-none bg-transparent px-0 text-xs focus-visible:ring-0"
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
                    Drag handle to reorder or use arrows.
                  </span>
                )}
              </div>
              {selectedChannels.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No channels added yet. Pick some from the right panel.
                </div>
              ) : (
                <ScrollArea className="max-h-[360px] rounded-2xl border border-border">
                  <div className="divide-y divide-border">
                    {selectedChannels.map((channel, index) => (
                      <div key={channel.channelId} className="flex gap-3 p-4">
                        <div className="flex flex-col items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleReorder(index, "up")}
                            disabled={index === 0}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <button
                            type="button"
                            onClick={() => handleReorder(index, "down")}
                            disabled={index === selectedChannels.length - 1}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            ↓
                          </button>
                        </div>
                        <div className="flex flex-1 gap-4">
                          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                            {channel.channelThumbnail ? (
                              <Image
                                src={channel.channelThumbnail}
                                alt={channel.channelTitle}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                {channel.channelTitle.slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold">{channel.channelTitle}</p>
                                <p className="text-xs text-muted-foreground">
                                  {channel.subscriberCount
                                    ? `${channel.subscriberCount} subscribers`
                                    : "Subscriber info unavailable"}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveChannel(channel.channelId)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <Textarea
                              placeholder="Add personal notes or why you love this channel..."
                              value={channel.notes ?? ""}
                              onChange={(event) =>
                                setSelectedChannels((prev) =>
                                  prev.map((item, idx) =>
                                    idx === index ? { ...item, notes: event.target.value } : item
                                  )
                                )
                              }
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-border bg-muted/30 p-4">
            <div className="space-y-2">
              <Label htmlFor="channel-search">Add channels</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="channel-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search your connected channels..."
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Showing channels you&apos;ve already connected to what2watch.
              </p>
            </div>
            <ScrollArea className="h-[420px]">
              <div className="space-y-3">
                {availableWithoutSelection.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    {availableChannels.length === 0
                      ? "Add some YouTube channels first, then come back to curate a list."
                      : "No more channels match your search."}
                  </div>
                ) : (
                  availableWithoutSelection.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-3"
                    >
                      <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-border bg-muted">
                        {channel.thumbnail ? (
                          <Image
                            src={channel.thumbnail}
                            alt={channel.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                            {channel.title.slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold line-clamp-1">{channel.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {channel.subscriberCount ? `${channel.subscriberCount} subscribers` : channel.channelUrl}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        onClick={() => handleAddChannel(channel)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
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
        </form>
      </DialogContent>
    </Dialog>
  );
}

