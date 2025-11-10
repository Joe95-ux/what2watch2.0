"use client";

import { useState, useEffect } from "react";
import { useCreatePlaylist, useUpdatePlaylist, type Playlist } from "@/hooks/use-playlists";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist?: Playlist;
}

export default function CreatePlaylistModal({ isOpen, onClose, playlist }: CreatePlaylistModalProps) {
  const createPlaylist = useCreatePlaylist();
  const updatePlaylist = useUpdatePlaylist();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const isEditing = !!playlist;

  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      setDescription(playlist.description || "");
      setIsPublic(playlist.isPublic);
    } else {
      setName("");
      setDescription("");
      setIsPublic(false);
    }
  }, [playlist, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Playlist name is required");
      return;
    }

    try {
      if (isEditing && playlist) {
        await updatePlaylist.mutateAsync({
          playlistId: playlist.id,
          updates: {
            name: name.trim(),
            description: description.trim() || undefined,
            isPublic,
          },
        });
        toast.success("Playlist updated");
      } else {
        await createPlaylist.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          isPublic,
        });
        toast.success("Playlist created");
      }
      onClose();
    } catch (error) {
      toast.error(isEditing ? "Failed to update playlist" : "Failed to create playlist");
      console.error(error);
    }
  };

  const isLoading = createPlaylist.isPending || updatePlaylist.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Playlist" : "Create Playlist"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your playlist details"
              : "Create a new playlist to organize your favorite movies and TV shows"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Playlist"
                disabled={isLoading}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this playlist about?"
                disabled={isLoading}
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="public">Public Playlist</Label>
                <p className="text-sm text-muted-foreground">
                  Anyone can view this playlist
                </p>
              </div>
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (isEditing ? "Updating..." : "Creating...") : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

