"use client";

import { useState, useMemo } from "react";
import { usePlaylists, useDeletePlaylist, type Playlist } from "@/hooks/use-playlists";
import { useLikedPlaylists } from "@/hooks/use-playlist-likes";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreatePlaylistModal from "./create-playlist-modal";
import PlaylistCard from "@/components/browse/playlist-card";

type FilterType = "all" | "created" | "shared";

export default function PlaylistsContent() {
  const { user: clerkUser } = useUser();
  const { data: ownPlaylists = [], isLoading: isLoadingOwn } = usePlaylists();
  const { data: likedPlaylists = [], isLoading: isLoadingLiked } = useLikedPlaylists();
  const deletePlaylist = useDeletePlaylist();
  const router = useRouter();
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const isLoading = isLoadingOwn || isLoadingLiked;

  const handleDelete = async () => {
    if (!playlistToDelete) return;

    try {
      await deletePlaylist.mutateAsync(playlistToDelete.id);
      toast.success(`Deleted "${playlistToDelete.name}"`);
      setPlaylistToDelete(null);
    } catch (error) {
      toast.error("Failed to delete playlist");
      console.error(error);
    }
  };

  // Combine and filter playlists
  const allPlaylists = useMemo(() => {
    const own = ownPlaylists.map((p) => ({ ...p, isOwn: true, isLiked: false }));
    const liked = likedPlaylists.map((p) => ({ ...p, isOwn: false, isLiked: true }));
    
    // Remove duplicates (if a playlist is both own and liked, prioritize own)
    const playlistMap = new Map<string, Playlist & { isOwn: boolean; isLiked: boolean }>();
    
    // Add own playlists first
    own.forEach((p) => playlistMap.set(p.id, p));
    
    // Add liked playlists (won't overwrite own)
    liked.forEach((p) => {
      if (!playlistMap.has(p.id)) {
        playlistMap.set(p.id, p);
      }
    });
    
    return Array.from(playlistMap.values());
  }, [ownPlaylists, likedPlaylists]);

  const filteredPlaylists = useMemo(() => {
    if (!clerkUser?.id) return allPlaylists;
    
    switch (filter) {
      case "created":
        return allPlaylists.filter((p) => p.isOwn);
      case "shared":
        return allPlaylists.filter((p) => p.isLiked && !p.isOwn);
      default:
        return allPlaylists;
    }
  }, [allPlaylists, filter, clerkUser?.id]);

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Playlists</h1>
          <p className="text-muted-foreground">
            {filteredPlaylists.length} {filteredPlaylists.length === 1 ? "playlist" : "playlists"}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Create Playlist
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="created">Created by you</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Playlists Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
          ))}
        </div>
      ) : filteredPlaylists.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center space-y-4 py-16">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
            <Plus className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold">No playlists yet</h2>
          <p className="text-muted-foreground max-w-md">
            {filter === "created"
              ? "Create your first playlist to organize your favorite movies and TV shows."
              : filter === "shared"
              ? "Like playlists from other users to see them here."
              : "Create your first playlist or like playlists from other users."}
          </p>
          {filter === "created" && (
            <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4 cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              Create Playlist
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {filteredPlaylists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                showLikeButton={!playlist.isOwn}
              />
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!playlistToDelete} onOpenChange={(open) => !open && setPlaylistToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{playlistToDelete?.name}</strong>? This action cannot be undone and all items in the playlist will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deletePlaylist.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePlaylist.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Modal */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen || !!playlistToEdit}
        onClose={() => {
          setIsCreateModalOpen(false);
          setPlaylistToEdit(null);
        }}
        playlist={playlistToEdit || undefined}
      />
    </div>
  );
}

