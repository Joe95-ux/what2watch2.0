"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { ChevronRight, ListCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ResponsiveMenuSurface, ResponsiveMenuPlaceholder } from "@/components/ui/responsive-menu-surface";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const updateList = useUpdateYouTubeChannelList();
  const { data: myLists = [], isLoading } = useYouTubeChannelLists("mine");
  const [open, setOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const { data: selectedList } = useYouTubeChannelList(selectedListId);
  const normalizedTitle = channel.title || "Unknown Channel";

  const listMap = useMemo(() => new Map(myLists.map((list) => [list.id, list])), [myLists]);
  const [localMembership, setLocalMembership] = useState<Record<string, boolean>>({});

  const requireAuth = () => {
    if (isSignedIn) return true;
    toast.info("Sign in to add channels to your lists.");
    openSignIn?.({
      afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
    });
    return false;
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !requireAuth()) return;
    setOpen(nextOpen);
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
      await updateList.mutateAsync({ listId, channels: nextItems });
      setLocalMembership((prev) => ({ ...prev, [listId]: !exists }));
      toast.success(exists ? `Removed from "${baseList.name}"` : `Added to "${baseList.name}"`);
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

  const header = (
    <p className="text-sm font-medium text-foreground">Add channel to list</p>
  );

  const footer = isMobile ? (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        setBuilderOpen(true);
      }}
      className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer hover:bg-muted transition-colors"
    >
      <Plus className="h-4 w-4" />
      Create list
    </button>
  ) : (
    <DropdownMenuItem
      className="cursor-pointer rounded-none"
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
  );

  const renderRows = () => {
    if (isLoading) {
      return isMobile ? (
        <ResponsiveMenuPlaceholder>Loading your lists...</ResponsiveMenuPlaceholder>
      ) : (
        <DropdownMenuItem disabled>Loading your lists...</DropdownMenuItem>
      );
    }
    if (myLists.length === 0) {
      return isMobile ? (
        <ResponsiveMenuPlaceholder>No lists yet</ResponsiveMenuPlaceholder>
      ) : (
        <DropdownMenuItem disabled>No lists yet</DropdownMenuItem>
      );
    }

    return myLists.map((list) => {
      const isInList = localMembership[list.id] ?? isChannelInList(list);
      const row = (
        <div className="flex items-center w-full">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void handleToggleInList(list.id);
            }}
            className={cn(
              "flex items-center gap-2 flex-1 min-w-0 px-2 py-2 rounded transition-colors text-left cursor-pointer hover:bg-muted",
              isInList && "bg-muted/70 text-primary"
            )}
          >
            <ListCheck
              className={cn(
                "h-4 w-4 flex-shrink-0",
                isInList ? "text-green-500" : "text-muted-foreground"
              )}
            />
            <span className="truncate">{list.name}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/youtube-channel/lists/${list.id}`);
              setOpen(false);
            }}
            className="p-2 rounded transition-colors flex-shrink-0 hover:bg-muted cursor-pointer"
            title="Open list"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      );

      if (isMobile) {
        return (
          <div
            key={list.id}
            className={cn(updateList.isPending && "opacity-60 pointer-events-none")}
          >
            {row}
          </div>
        );
      }

      return (
        <DropdownMenuItem
          key={list.id}
          onSelect={(e) => e.preventDefault()}
          className="p-0"
          disabled={updateList.isPending}
        >
          {row}
        </DropdownMenuItem>
      );
    });
  };

  return (
    <>
      <ResponsiveMenuSurface
        open={open}
        onOpenChange={handleOpenChange}
        trigger={trigger || defaultTrigger}
        accessibilityTitle="Add channel to list"
        header={header}
        footer={footer}
        dropdownClassName="w-64 max-h-[360px]"
        bodyClassName="p-2 space-y-1"
      >
        {renderRows()}
      </ResponsiveMenuSurface>

      <ChannelListBuilder
        isOpen={builderOpen}
        onClose={() => setBuilderOpen(false)}
        initialData={null}
      />
    </>
  );
}
