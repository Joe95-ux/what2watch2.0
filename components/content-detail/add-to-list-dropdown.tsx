"use client";

import { useState, useCallback, useRef } from "react";
import { usePlaylists, useAddItemToPlaylist, useRemoveItemFromPlaylist, type Playlist } from "@/hooks/use-playlists";
import { useLists, useUpdateList, useRemoveItemFromList, type List } from "@/hooks/use-lists";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ResponsiveMenuSurface, ResponsiveMenuPlaceholder } from "@/components/ui/responsive-menu-surface";
import { Button } from "@/components/ui/button";
import { Plus, ListCheck, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CreatePlaylistModal from "@/components/playlists/create-playlist-modal";
import CreateListModal from "@/components/lists/create-list-modal";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUser } from "@clerk/nextjs";
import { useClerk } from "@clerk/nextjs";

interface AddToListDropdownProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  trigger?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  onAddSuccess?: () => void;
}

export default function AddToListDropdown({ item, type, trigger, onOpenChange, onAddSuccess }: AddToListDropdownProps) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const { data: playlists = [], isLoading: isLoadingPlaylists } = usePlaylists();
  const { data: lists = [], isLoading: isLoadingLists } = useLists();
  const addItemToPlaylist = useAddItemToPlaylist();
  const removeItemFromPlaylist = useRemoveItemFromPlaylist();
  const updateList = useUpdateList();
  const removeItemFromList = useRemoveItemFromList();
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [pendingPlaylistId, setPendingPlaylistId] = useState<string | null>(null);
  const [pendingListId, setPendingListId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"playlist" | "list">("playlist");
  const lastOpenRef = useRef<boolean>(false);
  const isMobile = useIsMobile();

  const promptSignIn = useCallback(
    (message?: string) => {
      toast.info(message ?? "Please sign in to perform this action.");
      if (openSignIn) {
        openSignIn({
          afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
        });
      }
    },
    [openSignIn]
  );

  const requireAuth = useCallback(
    async (action: () => Promise<void> | void, message?: string) => {
      if (!isSignedIn) {
        promptSignIn(message);
        return;
      }
      return action();
    },
    [isSignedIn, promptSignIn]
  );

  const handleOpenChange = useCallback((open: boolean) => {
    if (open && !isSignedIn) {
      promptSignIn("Sign in to add items to lists or playlists.");
      return;
    }
    if (lastOpenRef.current === open) return;
    lastOpenRef.current = open;
    setIsDropdownOpen(open);
    onOpenChange?.(open);
  }, [isSignedIn, onOpenChange, promptSignIn]);

  const handleTogglePlaylist = async (playlistId: string) => {
    await requireAuth(async () => {
      setPendingPlaylistId(playlistId);
      try {
        const playlist = playlists.find((p) => p.id === playlistId);
        if (!playlist) return;

        const isInPlaylist = isItemInPlaylist(playlist);
        
        if (isInPlaylist) {
          // Remove from playlist
          const playlistItem = playlist.items?.find(
            (playlistItem) => playlistItem.tmdbId === item.id && playlistItem.mediaType === type
          );
          if (playlistItem?.id) {
            await removeItemFromPlaylist.mutateAsync({
              playlistId,
              itemId: playlistItem.id,
            });
            toast.success(`Removed from "${playlist.name}"`);
          }
        } else {
          // Add to playlist
          const title = "title" in item ? item.title : item.name;
          const releaseDate = type === "movie" ? (item as TMDBMovie).release_date : undefined;
          const firstAirDate = type === "tv" ? (item as TMDBSeries).first_air_date : undefined;

          await addItemToPlaylist.mutateAsync({
            playlistId,
            item: {
              tmdbId: item.id,
              mediaType: type,
              title,
              posterPath: item.poster_path,
              backdropPath: item.backdrop_path,
              releaseDate,
              firstAirDate,
            },
          });
          toast.success(`Added to "${playlist.name}"`);
        }
        onAddSuccess?.();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update playlist";
        toast.error(errorMessage);
        console.error(error);
      } finally {
        setPendingPlaylistId(null);
      }
    }, "Sign in to manage playlists.");
  };

  const handleToggleList = async (listId: string) => {
    await requireAuth(async () => {
      setPendingListId(listId);
      try {
        const list = lists.find((l) => l.id === listId);
        if (!list) return;

        const existingItems = list.items || [];
        const listItem = existingItems.find(
          (listItem) => listItem.tmdbId === item.id && listItem.mediaType === type
        );
        const isInList = !!listItem;

        if (isInList) {
          // Remove from list
          if (listItem.id) {
            await removeItemFromList.mutateAsync({
              listId,
              itemId: listItem.id,
            });
            toast.success(`Removed from "${list.name}"`);
          }
        } else {
          // Add to list
          const title = "title" in item ? item.title : item.name;
          const newItems = [
            ...existingItems.map((i) => ({
              ...i,
              position: i.position,
            })),
            {
              tmdbId: item.id,
              mediaType: type,
              title,
              posterPath: item.poster_path || null,
              backdropPath: item.backdrop_path || null,
              releaseDate: type === "movie" ? (item as TMDBMovie).release_date || null : null,
              firstAirDate: type === "tv" ? (item as TMDBSeries).first_air_date || null : null,
              position: existingItems.length + 1,
            },
          ];

          await updateList.mutateAsync({
            listId,
            items: newItems,
          });
          toast.success(`Added to "${list.name}"`);
        }
        onAddSuccess?.();
      } catch (error) {
        toast.error("Failed to update list");
        console.error(error);
      } finally {
        setPendingListId(null);
      }
    }, "Sign in to manage lists.");
  };

  const isItemInPlaylist = (playlist: Playlist) => {
    if (!playlist.items) return false;
    return playlist.items.some(
      (playlistItem) => playlistItem.tmdbId === item.id && playlistItem.mediaType === type
    );
  };

  const isItemInList = (list: List) => {
    if (!list.items) return false;
    return list.items.some(
      (listItem) => listItem.tmdbId === item.id && listItem.mediaType === type
    );
  };

  const defaultTrigger = (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Plus className="h-4 w-4" />
    </Button>
  );

  const tabsHeader = (
    <div className="px-2 py-1.5">
      <div className="flex items-center gap-0">
        <button
          type="button"
          onClick={() => setActiveTab("playlist")}
          className={cn(
            "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer",
            activeTab === "playlist"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Playlist
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={cn(
            "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer",
            activeTab === "list"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          List
        </button>
      </div>
    </div>
  );

  const renderPlaylistRows = () => {
    if (isLoadingPlaylists) {
      return isMobile ? (
        <ResponsiveMenuPlaceholder>Loading playlists...</ResponsiveMenuPlaceholder>
      ) : (
        <DropdownMenuItem disabled>Loading playlists...</DropdownMenuItem>
      );
    }
    if (playlists.length === 0) {
      return isMobile ? (
        <ResponsiveMenuPlaceholder>No playlists yet</ResponsiveMenuPlaceholder>
      ) : (
        <DropdownMenuItem disabled>No playlists yet</DropdownMenuItem>
      );
    }
    return playlists.map((playlist) => {
      const isInPlaylist = isItemInPlaylist(playlist);
      const isRowPending = pendingPlaylistId === playlist.id;
      const row = (
        <div className="flex items-center w-full">
          <button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await handleTogglePlaylist(playlist.id);
            }}
            className="flex items-center gap-2 flex-1 min-w-0 px-2 py-2 hover:bg-muted rounded transition-colors cursor-pointer"
          >
            {isRowPending ? (
              <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <ListCheck
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isInPlaylist ? "text-green-500" : "text-muted-foreground"
                )}
              />
            )}
            <span className="truncate text-left">{playlist.name}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/dashboard/playlists/${playlist.id}`);
              setIsDropdownOpen(false);
            }}
            className="p-2 hover:bg-muted rounded transition-colors flex-shrink-0 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      );
      if (isMobile) {
        return (
          <div key={playlist.id} className={cn(isRowPending && "opacity-60 pointer-events-none")}>
            {row}
          </div>
        );
      }
      return (
        <DropdownMenuItem
          key={playlist.id}
          disabled={isRowPending}
          className="p-0"
          onSelect={(e) => e.preventDefault()}
        >
          {row}
        </DropdownMenuItem>
      );
    });
  };

  const renderListRows = () => {
    if (isLoadingLists) {
      return isMobile ? (
        <ResponsiveMenuPlaceholder>Loading lists...</ResponsiveMenuPlaceholder>
      ) : (
        <DropdownMenuItem disabled>Loading lists...</DropdownMenuItem>
      );
    }
    if (lists.length === 0) {
      return isMobile ? (
        <ResponsiveMenuPlaceholder>No lists yet</ResponsiveMenuPlaceholder>
      ) : (
        <DropdownMenuItem disabled>No lists yet</DropdownMenuItem>
      );
    }
    return lists.map((list) => {
      const isInList = isItemInList(list);
      const isRowPending = pendingListId === list.id;
      const row = (
        <div className="flex items-center w-full">
          <button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await handleToggleList(list.id);
            }}
            className="flex items-center gap-2 flex-1 min-w-0 px-2 py-2 hover:bg-muted rounded transition-colors cursor-pointer"
          >
            {isRowPending ? (
              <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <ListCheck
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isInList ? "text-green-500" : "text-muted-foreground"
                )}
              />
            )}
            <span className="truncate text-left">{list.name}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/dashboard/lists/${list.id}`);
              setIsDropdownOpen(false);
            }}
            className="p-2 hover:bg-muted rounded transition-colors flex-shrink-0 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      );
      if (isMobile) {
        return (
          <div key={list.id} className={cn(isRowPending && "opacity-60 pointer-events-none")}>
            {row}
          </div>
        );
      }
      return (
        <DropdownMenuItem
          key={list.id}
          disabled={isRowPending}
          className="p-0"
          onSelect={(e) => e.preventDefault()}
        >
          {row}
        </DropdownMenuItem>
      );
    });
  };

  const createFooter = isMobile ? (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isSignedIn) {
          toast.info(`Sign in to create ${activeTab === "playlist" ? "playlists" : "lists"}.`);
          if (openSignIn) {
            openSignIn({
              afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
            });
          }
          setIsDropdownOpen(false);
          return;
        }
        setIsDropdownOpen(false);
        if (activeTab === "playlist") {
          setIsCreatePlaylistModalOpen(true);
        } else {
          setIsCreateListModalOpen(true);
        }
      }}
      disabled={!isSignedIn}
      className={cn(
        "flex w-full items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer hover:bg-muted transition-colors",
        !isSignedIn && "opacity-50 cursor-not-allowed"
      )}
    >
      <Plus className="h-4 w-4" />
      {activeTab === "playlist"
        ? playlists.length === 0
          ? "Create Playlist"
          : "Create New Playlist"
        : lists.length === 0
          ? "Create List"
          : "Create New List"}
    </button>
  ) : (
    <div className="px-1 py-1">
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isSignedIn) {
            toast.info(`Sign in to create ${activeTab === "playlist" ? "playlists" : "lists"}.`);
            if (openSignIn) {
              openSignIn({
                afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
              });
            }
            setIsDropdownOpen(false);
            return;
          }
          setIsDropdownOpen(false);
          if (activeTab === "playlist") {
            setIsCreatePlaylistModalOpen(true);
          } else {
            setIsCreateListModalOpen(true);
          }
        }}
        disabled={!isSignedIn}
        className={cn("cursor-pointer", !isSignedIn && "opacity-50 cursor-not-allowed")}
      >
        <Plus className="h-4 w-4 mr-2" />
        {activeTab === "playlist"
          ? playlists.length === 0
            ? "Create Playlist"
            : "Create New Playlist"
          : lists.length === 0
            ? "Create List"
            : "Create New List"}
      </DropdownMenuItem>
    </div>
  );

  return (
    <>
      <ResponsiveMenuSurface
        open={isDropdownOpen}
        onOpenChange={handleOpenChange}
        trigger={trigger || defaultTrigger}
        accessibilityTitle="Add to list or playlist"
        header={tabsHeader}
        footer={createFooter}
        dropdownClassName="w-72"
        dropdownAlignOffset={isMobile ? -12 : 0}
        bodyClassName="px-2 pt-1"
        drawerClassName="max-h-[80vh]"
      >
        {activeTab === "playlist" ? renderPlaylistRows() : renderListRows()}
      </ResponsiveMenuSurface>

      <CreatePlaylistModal
        isOpen={isCreatePlaylistModalOpen}
        onClose={() => setIsCreatePlaylistModalOpen(false)}
        initialItem={{ item, type }}
      />
      <CreateListModal
        isOpen={isCreateListModalOpen}
        onClose={() => setIsCreateListModalOpen(false)}
        initialItem={{ item, type }}
      />
    </>
  );
}

