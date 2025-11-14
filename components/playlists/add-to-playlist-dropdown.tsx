"use client";

import { useState } from "react";
import { usePlaylists, useAddItemToPlaylist, type Playlist } from "@/hooks/use-playlists";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";
import CreatePlaylistModal from "./create-playlist-modal";

interface AddToPlaylistDropdownProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  trigger?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  onAddSuccess?: () => void; // Callback when item is successfully added
}

export default function AddToPlaylistDropdown({ item, type, trigger, onOpenChange, onAddSuccess }: AddToPlaylistDropdownProps) {
  const { data: playlists = [], isLoading } = usePlaylists();
  const addItemToPlaylist = useAddItemToPlaylist();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
      onAddSuccess?.(); // Call callback after successful addition
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

  const isItemInPlaylist = (playlist: Playlist) => {
    if (!playlist.items) return false;
    return playlist.items.some(
      (playlistItem) => playlistItem.tmdbId === item.id && playlistItem.mediaType === type
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
          className="w-56 z-[110]"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <DropdownMenuLabel>Add to Playlist</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isLoading ? (
            <DropdownMenuItem disabled>Loading playlists...</DropdownMenuItem>
          ) : playlists.length === 0 ? (
            <>
              <DropdownMenuItem disabled>No playlists yet</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDropdownOpen(false);
                  setIsCreateModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Playlist
              </DropdownMenuItem>
            </>
          ) : (
            <>
              {playlists.map((playlist) => {
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
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDropdownOpen(false);
                  setIsCreateModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Playlist
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}

