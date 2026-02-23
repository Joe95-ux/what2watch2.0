"use client";

import { useState, useCallback } from "react";
import { usePlaylists, useAddItemToPlaylist, useRemoveItemFromPlaylist, type Playlist } from "@/hooks/use-playlists";
import { useLists, useUpdateList, useRemoveItemFromList, type List } from "@/hooks/use-lists";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus, ListCheck, ChevronRight } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"playlist" | "list">("playlist");
  const isMobile = useIsMobile();

  const promptSignIn = useCallback(
    (message?: string) => {
      toast.error(message ?? "Please sign in to perform this action.");
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

  const handleOpenChange = (open: boolean) => {
    setIsDropdownOpen(open);
    onOpenChange?.(open);
  };

  const handleTogglePlaylist = async (playlistId: string) => {
    await requireAuth(async () => {
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
      }
    }, "Sign in to manage playlists.");
  };

  const handleToggleList = async (listId: string) => {
    await requireAuth(async () => {
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

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          {trigger || defaultTrigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          alignOffset={isMobile ? -12 : 0}
          sideOffset={4}
          className="w-72 z-[110] p-0 flex flex-col max-h-[400px]"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Tabs Header */}
          <div className="px-2 py-1.5 border-b border-border">
            <div className="flex items-center gap-0">
              <button
                onClick={() => setActiveTab("playlist")}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  activeTab === "playlist" 
                    ? "bg-muted text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Playlist
              </button>
              <button
                onClick={() => setActiveTab("list")}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  activeTab === "list" 
                    ? "bg-muted text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                List
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0 px-2 pt-1">
            {activeTab === "playlist" ? (
              <>
                {isLoadingPlaylists ? (
                  <DropdownMenuItem disabled>Loading playlists...</DropdownMenuItem>
                ) : playlists.length === 0 ? (
                  <DropdownMenuItem disabled>No playlists yet</DropdownMenuItem>
                ) : (
                  playlists.map((playlist) => {
                    const isInPlaylist = isItemInPlaylist(playlist);
                    return (
                      <DropdownMenuItem
                        key={playlist.id}
                        disabled={addItemToPlaylist.isPending || removeItemFromPlaylist.isPending}
                        className="p-0"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <div className="flex items-center w-full">
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              await handleTogglePlaylist(playlist.id);
                            }}
                            className="flex items-center gap-2 flex-1 min-w-0 px-2 py-2 hover:bg-muted rounded transition-colors cursor-pointer"
                          >
                            <ListCheck 
                              className={cn(
                                "h-4 w-4 flex-shrink-0",
                                isInPlaylist ? "text-green-500" : "text-muted-foreground"
                              )} 
                            />
                            <span className="truncate text-left">{playlist.name}</span>
                          </button>
                          <button
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
                      </DropdownMenuItem>
                    );
                  })
                )}
              </>
            ) : (
              <>
                {isLoadingLists ? (
                  <DropdownMenuItem disabled>Loading lists...</DropdownMenuItem>
                ) : lists.length === 0 ? (
                  <DropdownMenuItem disabled>No lists yet</DropdownMenuItem>
                ) : (
                  lists.map((list) => {
                    const isInList = isItemInList(list);
                    return (
                      <DropdownMenuItem
                        key={list.id}
                        disabled={updateList.isPending || removeItemFromList.isPending}
                        className="p-0"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <div className="flex items-center w-full">
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              await handleToggleList(list.id);
                            }}
                            className="flex items-center gap-2 flex-1 min-w-0 px-2 py-2 hover:bg-muted rounded transition-colors cursor-pointer"
                          >
                            <ListCheck 
                              className={cn(
                                "h-4 w-4 flex-shrink-0",
                                isInList ? "text-green-500" : "text-muted-foreground"
                              )} 
                            />
                            <span className="truncate text-left">{list.name}</span>
                          </button>
                          <button
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
                      </DropdownMenuItem>
                    );
                  })
                )}
              </>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="px-1 py-1">
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDropdownOpen(false);
                if (activeTab === "playlist") {
                  setIsCreatePlaylistModalOpen(true);
                } else {
                  setIsCreateListModalOpen(true);
                }
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {activeTab === "playlist" 
                ? (playlists.length === 0 ? "Create Playlist" : "Create New Playlist")
                : (lists.length === 0 ? "Create List" : "Create New List")
              }
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreatePlaylistModal
        isOpen={isCreatePlaylistModalOpen}
        onClose={() => setIsCreatePlaylistModalOpen(false)}
      />
      <CreateListModal
        isOpen={isCreateListModalOpen}
        onClose={() => setIsCreateListModalOpen(false)}
      />
    </>
  );
}

