"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePlaylists } from "@/hooks/use-playlists";
import { YouTubeVideo } from "@/hooks/use-youtube-channel";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ResponsiveMenuSurface, ResponsiveMenuPlaceholder } from "@/components/ui/responsive-menu-surface";
import { Button } from "@/components/ui/button";
import { Plus, ListCheck, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import CreatePlaylistModal from "./create-playlist-modal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface AddYouTubeVideoToPlaylistDropdownProps {
  video: YouTubeVideo;
  trigger?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  onAddSuccess?: () => void;
}

export default function AddYouTubeVideoToPlaylistDropdown({
  video,
  trigger,
  onOpenChange,
  onAddSuccess,
}: AddYouTubeVideoToPlaylistDropdownProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: playlists = [], isLoading } = usePlaylists();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleOpenChange = (open: boolean) => {
    setIsDropdownOpen(open);
    onOpenChange?.(open);
  };

  const playlistsWithVideo = useMemo(() => {
    const playlistIds = new Set<string>();
    playlists.forEach((playlist) => {
      if (playlist.youtubeItems?.some((item) => item.videoId === video.id)) {
        playlistIds.add(playlist.id);
      }
    });
    return playlistIds;
  }, [playlists, video.id]);

  const handleTogglePlaylist = async (playlistId: string) => {
    try {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist) return;

      const isInPlaylist = playlistsWithVideo.has(playlistId);

      if (isInPlaylist) {
        setIsRemoving(playlistId);
        const youtubeItem = playlist.youtubeItems?.find((item) => item.videoId === video.id);
        if (!youtubeItem?.id) {
          toast.error("Item not found in playlist");
          setIsRemoving(null);
          return;
        }

        const response = await fetch(
          `/api/youtube/videos/${video.id}/playlist?playlistId=${playlistId}&itemId=${youtubeItem.id}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to remove video from playlist");
        }

        toast.success(`Removed from "${playlist.name}"`);
      } else {
        setIsAdding(playlistId);
        const response = await fetch(`/api/youtube/videos/${video.id}/playlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playlistId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to add video to playlist");
        }

        toast.success(`Added to "${playlist.name}"`);
      }

      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      await queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      onAddSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update playlist";
      if (errorMessage.includes("already in playlist")) {
        toast.error("Video is already in this playlist");
      } else {
        toast.error(errorMessage);
      }
      console.error(error);
    } finally {
      setIsAdding(null);
      setIsRemoving(null);
    }
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
    <div className="p-1">
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDropdownOpen(false);
          setIsCreateModalOpen(true);
        }}
        className="cursor-pointer"
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
      const isInPlaylist = playlistsWithVideo.has(playlist.id);
      const isProcessing = isAdding === playlist.id || isRemoving === playlist.id;
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
            {isProcessing ? (
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
          <div key={playlist.id} className={cn(isProcessing && "opacity-60 pointer-events-none")}>
            {row}
          </div>
        );
      }

      return (
        <DropdownMenuItem
          key={playlist.id}
          disabled={isProcessing}
          className="p-0"
          onSelect={(e) => e.preventDefault()}
        >
          {row}
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
        accessibilityTitle="Add video to playlist"
        header={header}
        footer={footer}
        dropdownClassName="w-72"
        dropdownAlignOffset={isMobile ? -12 : 0}
        bodyClassName="px-2 pt-1"
      >
        {renderRows()}
      </ResponsiveMenuSurface>
      <CreatePlaylistModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </>
  );
}
