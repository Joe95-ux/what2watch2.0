"use client";

import { useState } from "react";
import { usePlaylists, useAddItemToPlaylist, type Playlist } from "@/hooks/use-playlists";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ResponsiveMenuSurface, ResponsiveMenuPlaceholder } from "@/components/ui/responsive-menu-surface";
import { Button } from "@/components/ui/button";
import { Plus, Check, ListCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import CreatePlaylistModal from "./create-playlist-modal";
import { useIsMobile } from "@/hooks/use-mobile";

interface AddToPlaylistDropdownProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  trigger?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  onAddSuccess?: () => void;
}

export default function AddToPlaylistDropdown({
  item,
  type,
  trigger,
  onOpenChange,
  onAddSuccess,
}: AddToPlaylistDropdownProps) {
  const { data: playlists = [], isLoading } = usePlaylists();
  const addItemToPlaylist = useAddItemToPlaylist();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [pendingPlaylistId, setPendingPlaylistId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleOpenChange = (open: boolean) => {
    setIsDropdownOpen(open);
    onOpenChange?.(open);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    setPendingPlaylistId(playlistId);
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
      setIsDropdownOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add to playlist";
      if (errorMessage.includes("already in playlist")) {
        toast.error("Item is already in this playlist");
      } else {
        toast.error("Failed to add to playlist");
      }
      console.error(error);
    } finally {
      setPendingPlaylistId(null);
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

  const header = <p className="px-2 text-sm font-medium text-foreground">Add to Playlist</p>;

  const footer = isMobile ? (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDropdownOpen(false);
        setIsCreateModalOpen(true);
      }}
      className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer hover:bg-muted transition-colors"
    >
      <Plus className="h-4 w-4" />
      {playlists.length === 0 ? "Create Playlist" : "Create New Playlist"}
    </button>
  ) : (
    <div className="px-1 py-1">
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
        {playlists.length === 0 ? "Create Playlist" : "Create New Playlist"}
      </DropdownMenuItem>
    </div>
  );

  const renderRows = () => {
    if (isLoading) {
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

      if (isMobile) {
        return (
          <button
            key={playlist.id}
            type="button"
            disabled={isInPlaylist || isRowPending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isInPlaylist) void handleAddToPlaylist(playlist.id);
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isInPlaylist ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : isRowPending ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <ListCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1 truncate">{playlist.name}</span>
            {isInPlaylist ? <span className="text-xs text-muted-foreground">Added</span> : null}
          </button>
        );
      }

      return (
        <DropdownMenuItem
          key={playlist.id}
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isInPlaylist) await handleAddToPlaylist(playlist.id);
          }}
          disabled={isInPlaylist || isRowPending}
        >
          {isInPlaylist ? (
            <>
              <Check className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="flex-1">{playlist.name}</span>
              <span className="text-xs text-muted-foreground">Added</span>
            </>
          ) : (
            <>
              {isRowPending ? (
                <Loader2 className="h-4 w-4 mr-2 flex-shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <ListCheck className="h-4 w-4 mr-2 flex-shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1">{playlist.name}</span>
            </>
          )}
        </DropdownMenuItem>
      );
    });
  };

  return (
    <>
      <ResponsiveMenuSurface
        open={isDropdownOpen}
        onOpenChange={handleOpenChange}
        trigger={trigger || defaultTrigger}
        accessibilityTitle="Add to playlist"
        header={header}
        footer={footer}
        dropdownClassName="ml-2 w-80"
        dropdownAlignOffset={isMobile ? -12 : 0}
        bodyClassName="px-2"
      >
        {renderRows()}
      </ResponsiveMenuSurface>

      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialItem={{ item, type }}
      />
    </>
  );
}
