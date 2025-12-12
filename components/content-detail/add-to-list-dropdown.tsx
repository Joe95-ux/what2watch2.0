"use client";

import { useState } from "react";
import { usePlaylists, useAddItemToPlaylist, type Playlist } from "@/hooks/use-playlists";
import { useLists, useUpdateList, type List } from "@/hooks/use-lists";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";
import CreatePlaylistModal from "@/components/playlists/create-playlist-modal";
import CreateListModal from "@/components/lists/create-list-modal";
import { cn } from "@/lib/utils";

interface AddToListDropdownProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  trigger?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  onAddSuccess?: () => void;
}

export default function AddToListDropdown({ item, type, trigger, onOpenChange, onAddSuccess }: AddToListDropdownProps) {
  const { data: playlists = [], isLoading: isLoadingPlaylists } = usePlaylists();
  const { data: lists = [], isLoading: isLoadingLists } = useLists();
  const addItemToPlaylist = useAddItemToPlaylist();
  const updateList = useUpdateList();
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"playlist" | "list">("playlist");

  const handleOpenChange = (open: boolean) => {
    setIsDropdownOpen(open);
    onOpenChange?.(open);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
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
      toast.success(`Added to "${playlists.find((p) => p.id === playlistId)?.name}"`);
      onAddSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add to playlist";
      if (errorMessage.includes("already in playlist")) {
        toast.error("Item is already in this playlist");
      } else {
        toast.error("Failed to add to playlist");
      }
      console.error(error);
    }
  };

  const handleAddToList = async (listId: string) => {
    try {
      const list = lists.find((l) => l.id === listId);
      if (!list) return;

      const title = "title" in item ? item.title : item.name;
      const existingItems = list.items || [];
      const isInList = existingItems.some(
        (listItem) => listItem.tmdbId === item.id && listItem.mediaType === type
      );

      if (isInList) {
        toast.error("Item is already in this list");
        return;
      }

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
      onAddSuccess?.();
    } catch (error) {
      toast.error("Failed to add to list");
      console.error(error);
    }
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
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isInPlaylist) {
                            await handleAddToPlaylist(playlist.id);
                            setIsDropdownOpen(false);
                          }
                        }}
                        disabled={isInPlaylist || addItemToPlaylist.isPending}
                      >
                        {isInPlaylist ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            <span className="flex-1">{playlist.name}</span>
                            <span className="text-xs text-muted-foreground">Added</span>
                          </>
                        ) : (
                          <span>{playlist.name}</span>
                        )}
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
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isInList) {
                            await handleAddToList(list.id);
                            setIsDropdownOpen(false);
                          }
                        }}
                        disabled={isInList || updateList.isPending}
                      >
                        {isInList ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            <span className="flex-1">{list.name}</span>
                            <span className="text-xs text-muted-foreground">Added</span>
                          </>
                        ) : (
                          <span>{list.name}</span>
                        )}
                      </DropdownMenuItem>
                    );
                  })
                )}
              </>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="px-1 pt-1">
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

