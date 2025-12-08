"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { usePlaylists, useCreatePlaylist, useUpdatePlaylist } from "@/hooks/use-playlists";

interface MoveToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: Array<{
    id: string;
    tmdbId?: number;
    mediaType?: "movie" | "tv";
    title: string;
    posterPath?: string | null;
    backdropPath?: string | null;
    releaseDate?: string | null;
    firstAirDate?: string | null;
    videoId?: string;
    thumbnail?: string | null;
    description?: string | null;
    duration?: string | null;
    publishedAt?: string | null;
    channelId?: string;
    channelTitle?: string | null;
  }>;
  currentPlaylistId: string;
  onRemove?: (itemId: string) => Promise<void>;
  onSuccess: () => void;
}

export function MoveToPlaylistModal({
  isOpen,
  onClose,
  selectedItems,
  currentPlaylistId,
  onRemove,
  onSuccess,
}: MoveToPlaylistModalProps) {
  const { data: playlists = [] } = usePlaylists();
  const updatePlaylist = useUpdatePlaylist();
  const createPlaylist = useCreatePlaylist();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);

  const handleMove = async () => {
    setIsRemoving(true);
    try {
      if (isCreatingNew) {
        const tmdbItems = selectedItems.filter((item) => item.tmdbId);
        await createPlaylist.mutateAsync({
          name: newPlaylistName,
          items: tmdbItems.map((item) => ({
            tmdbId: item.tmdbId!,
            mediaType: item.mediaType!,
            title: item.title,
            posterPath: item.posterPath,
            backdropPath: item.backdropPath,
            releaseDate: item.releaseDate,
            firstAirDate: item.firstAirDate,
            order: tmdbItems.indexOf(item) + 1,
          })),
        });

        // Remove from current playlist
        if (onRemove) {
          for (const item of selectedItems) {
            await onRemove(item.id);
          }
        }

        toast.success(
          `Created new playlist and moved ${selectedItems.length} item${
            selectedItems.length > 1 ? "s" : ""
          }`
        );
      } else if (selectedPlaylistId) {
        const playlist = playlists.find((p) => p.id === selectedPlaylistId);
        if (!playlist) {
          toast.error("Playlist not found");
          return;
        }

        // Get existing items to calculate next order
        const existingItems = playlist.items || [];
        const existingYouTubeItems = playlist.youtubeItems || [];
        const maxOrder = Math.max(
          ...existingItems.map((item) => item.order),
          ...existingYouTubeItems.map((item) => item.order),
          0
        );

        // Separate TMDB items and YouTube items
        const tmdbItems = selectedItems.filter((item) => item.tmdbId);
        const youtubeItems = selectedItems.filter((item) => item.videoId);

        // Add TMDB items
        if (tmdbItems.length > 0) {
          for (let i = 0; i < tmdbItems.length; i++) {
            const item = tmdbItems[i];
            await fetch(`/api/playlists/${selectedPlaylistId}/items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tmdbId: item.tmdbId,
                mediaType: item.mediaType,
                title: item.title,
                posterPath: item.posterPath,
                backdropPath: item.backdropPath,
                releaseDate: item.releaseDate,
                firstAirDate: item.firstAirDate,
              }),
            });
          }
        }

        // Add YouTube items
        if (youtubeItems.length > 0) {
          toast.info("YouTube video moving coming soon");
        }

        // Remove from current playlist
        if (onRemove) {
          for (const item of selectedItems) {
            await onRemove(item.id);
          }
        }

        toast.success(
          `Moved ${selectedItems.length} item${
            selectedItems.length > 1 ? "s" : ""
          } to playlist`
        );
      } else {
        toast.error("Please select a playlist or create a new one");
        return;
      }
      onSuccess();
    } catch (error) {
      toast.error("Failed to move items");
      console.error(error);
    } finally {
      setIsRemoving(false);
    }
  };

  // Filter out current playlist from available playlists
  const availablePlaylists = playlists.filter((p) => p.id !== currentPlaylistId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to Playlist</DialogTitle>
          <DialogDescription>
            Move {selectedItems.length} item
            {selectedItems.length > 1 ? "s" : ""} to a playlist (items will be
            removed from current playlist)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Playlist</Label>
            <Select
              value={selectedPlaylistId}
              onValueChange={(value) => {
                setSelectedPlaylistId(value);
                setIsCreatingNew(value === "new");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a playlist or create new" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Create New Playlist</SelectItem>
                {availablePlaylists.map((playlist) => (
                  <SelectItem key={playlist.id} value={playlist.id}>
                    {playlist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isCreatingNew && (
            <div className="space-y-2">
              <Label>New Playlist Name</Label>
              <Input
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Enter playlist name"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isRemoving}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={
              (isCreatingNew && !newPlaylistName.trim()) ||
              (!isCreatingNew && !selectedPlaylistId) ||
              createPlaylist.isPending ||
              updatePlaylist.isPending ||
              isRemoving
            }
            className="cursor-pointer"
          >
            {createPlaylist.isPending || updatePlaylist.isPending || isRemoving ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Moving...
              </>
            ) : (
              "Move"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

