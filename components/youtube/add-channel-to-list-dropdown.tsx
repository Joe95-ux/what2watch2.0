"use client";

import { useMemo, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { ListCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useUpdateYouTubeChannelList,
  useYouTubeChannelList,
  useYouTubeChannelLists,
  type YouTubeChannelList,
} from "@/hooks/use-youtube-channel-lists";
import { ChannelListBuilder } from "@/components/youtube/channel-lists/channel-list-builder";

interface YouTubeAddToListDropdownProps {
  channel: {
    channelId: string;
    title: string;
    thumbnail?: string | null;
    channelUrl?: string | null;
    subscriberCount?: string;
    videoCount?: string;
  };
  trigger?: React.ReactNode;
}

export function YouTubeAddToListDropdown({ channel, trigger }: YouTubeAddToListDropdownProps) {
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const updateList = useUpdateYouTubeChannelList();
  const { data: myLists = [], isLoading } = useYouTubeChannelLists("mine");
  const [open, setOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Pull selected list detail so we always patch from latest server state.
  const { data: selectedList } = useYouTubeChannelList(selectedListId);

  const normalizedTitle = channel.title || "Unknown Channel";

  const listMap = useMemo(() => {
    return new Map(myLists.map((list) => [list.id, list]));
  }, [myLists]);

  const requireAuth = () => {
    if (isSignedIn) return true;
    toast.info("Sign in to add channels to your lists.");
    openSignIn?.({
      afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
    });
    return false;
  };

  const isChannelInList = (list: YouTubeChannelList) =>
    list.items.some((item) => item.channelId === channel.channelId);

  const handleToggleInList = async (listId: string) => {
    if (!requireAuth()) return;
    setSelectedListId(listId);
    const baseList = selectedList && selectedList.id === listId ? selectedList : listMap.get(listId);
    if (!baseList) return;

    const exists = baseList.items.some((item) => item.channelId === channel.channelId);
    const nextItems = exists
      ? baseList.items
          .filter((item) => item.channelId !== channel.channelId)
          .map((item, index) => ({
            channelId: item.channelId,
            channelTitle: item.channelTitle,
            channelThumbnail: item.channelThumbnail,
            channelDescription: item.channelDescription,
            subscriberCount: item.subscriberCount,
            videoCount: item.videoCount,
            channelUrl: item.channelUrl,
            notes: item.notes,
            position: index + 1,
          }))
      : [
          ...baseList.items.map((item, index) => ({
            channelId: item.channelId,
            channelTitle: item.channelTitle,
            channelThumbnail: item.channelThumbnail,
            channelDescription: item.channelDescription,
            subscriberCount: item.subscriberCount,
            videoCount: item.videoCount,
            channelUrl: item.channelUrl,
            notes: item.notes,
            position: index + 1,
          })),
          {
            channelId: channel.channelId,
            channelTitle: normalizedTitle,
            channelThumbnail: channel.thumbnail ?? null,
            channelDescription: null,
            subscriberCount: channel.subscriberCount ?? null,
            videoCount: channel.videoCount ?? null,
            channelUrl: channel.channelUrl ?? null,
            notes: "",
            position: baseList.items.length + 1,
          },
        ];

    try {
      await updateList.mutateAsync({
        listId,
        channels: nextItems,
      });
      toast.success(
        exists ? `Removed from "${baseList.name}"` : `Added to "${baseList.name}"`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update list");
    }
  };

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-3 text-xs border border-border hover:border-primary/30 cursor-pointer"
    >
      <Plus className="h-3.5 w-3.5 mr-1.5" />
      Add to
    </Button>
  );

  return (
    <>
      <DropdownMenu
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen && !requireAuth()) return;
          setOpen(nextOpen);
        }}
      >
        <DropdownMenuTrigger asChild>{trigger || defaultTrigger}</DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={4}
          className="w-64 p-0 flex flex-col max-h-[360px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1.5 border-b border-border text-xs text-muted-foreground">
            Add channel to list
          </div>
          <div className="overflow-y-auto scrollbar-thin p-2 space-y-1">
            {isLoading ? (
              <DropdownMenuItem disabled>Loading your lists...</DropdownMenuItem>
            ) : myLists.length === 0 ? (
              <DropdownMenuItem disabled>No lists yet</DropdownMenuItem>
            ) : (
              myLists.map((list) => {
                const isInList = isChannelInList(list);
                return (
                  <DropdownMenuItem
                    key={list.id}
                    onSelect={(e) => e.preventDefault()}
                    className="p-0"
                    disabled={updateList.isPending}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleInList(list.id);
                      }}
                      className={cn(
                        "w-full px-2 py-2 rounded text-left flex items-center gap-2 cursor-pointer hover:bg-muted",
                        isInList && "text-primary"
                      )}
                    >
                      <ListCheck
                        className={cn(
                          "h-4 w-4",
                          isInList ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span className="truncate">{list.name}</span>
                    </button>
                  </DropdownMenuItem>
                );
              })
            )}
          </div>
          <div className="p-1">
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                setBuilderOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create list
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChannelListBuilder
        isOpen={builderOpen}
        onClose={() => setBuilderOpen(false)}
        initialData={null}
      />
    </>
  );
}

