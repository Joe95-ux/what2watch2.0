"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePlaylists } from "@/hooks/use-playlists";
import { YouTubeVideo } from "@/hooks/use-youtube-channel";
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
import { useIsMobile } from "@/hooks/use-mobile";

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
  const { data: playlists = [], isLoading } = usePlaylists();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleOpenChange = (open: boolean) => {
    setIsDropdownOpen(open);
    onOpenChange?.(open);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      setIsAdding(playlistId);
      const response = await fetch(`/api/youtube/videos/${video.id}/playlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playlistId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add video to playlist");
      }

      await response.json();
      toast.success(`Added to "${playlists.find((p) => p.id === playlistId)?.name}"`);
      // Invalidate playlists query to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      // Also invalidate the specific playlist query
      await queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      onAddSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add to playlist";
      if (errorMessage.includes("already in playlist")) {
        toast.error("Video is already in this playlist");
      } else {
        toast.error("Failed to add video to playlist");
      }
      console.error(error);
    } finally {
      setIsAdding(null);
    }
  };

  // Check which playlists contain this video
  const playlistsWithVideo = useMemo(() => {
    const playlistIds = new Set<string>();
    playlists.forEach((playlist) => {
      if (playlist.youtubeItems?.some((item) => item.videoId === video.id)) {
        playlistIds.add(playlist.id);
      }
    });
    return playlistIds;
  }, [playlists, video.id]);
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
          className="ml-2w-80 z-[110] p-0 flex flex-col max-h-[400px]"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Fixed Header */}
          <div className="px-2 py-1.5 border-b border-border">
            <DropdownMenuLabel className="px-2">Add to Playlist</DropdownMenuLabel>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0 px-2">
            {isLoading ? (
              <DropdownMenuItem disabled>Loading playlists...</DropdownMenuItem>
            ) : playlists.length === 0 ? (
              <DropdownMenuItem disabled>No playlists yet</DropdownMenuItem>
            ) : (
              playlists.map((playlist) => {
                const isInPlaylist = playlistsWithVideo.has(playlist.id);
                const isAddingToThis = isAdding === playlist.id;
                return (
                  <DropdownMenuItem
                    key={playlist.id}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isInPlaylist && !isAddingToThis) {
                        await handleAddToPlaylist(playlist.id);
                        setIsDropdownOpen(false);
                      }
                    }}
                    disabled={isInPlaylist || isAddingToThis}
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
          </div>

          {/* Fixed Footer */}
          <div className="px-1">
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
        </DropdownMenuContent>
      </DropdownMenu>
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}

