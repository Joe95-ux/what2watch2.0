"use client";

import { useState } from "react";
import { usePlaylists, useDeletePlaylist, type Playlist } from "@/hooks/use-playlists";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, Trash2, Edit2, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CreatePlaylistModal from "./create-playlist-modal";
import { getPosterUrl } from "@/lib/tmdb";

export default function PlaylistsContent() {
  const { data: playlists = [], isLoading } = usePlaylists();
  const deletePlaylist = useDeletePlaylist();
  const router = useRouter();
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);

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

  const getPlaylistCover = (playlist: Playlist) => {
    if (playlist.coverImage) {
      return playlist.coverImage;
    }
    // Use first item's poster as cover
    if (playlist.items && playlist.items.length > 0) {
      const firstItem = playlist.items[0];
      if (firstItem.posterPath) {
        return getPosterUrl(firstItem.posterPath, "w500");
      }
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Playlists</h1>
          <p className="text-muted-foreground">
            {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Create Playlist
        </Button>
      </div>

      {/* Playlists Grid */}
      {playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center space-y-4 py-16">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
            <Plus className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold">No playlists yet</h2>
          <p className="text-muted-foreground max-w-md">
            Create your first playlist to organize your favorite movies and TV shows.
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4 cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Create Playlist
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {playlists.map((playlist) => {
            const coverImage = getPlaylistCover(playlist);
            const itemCount = playlist._count?.items || playlist.items?.length || 0;

            return (
              <div
                key={playlist.id}
                className="group relative bg-card rounded-lg border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/playlists/${playlist.id}`)}
              >
                {/* Cover Image */}
                <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">No Cover</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Playlist Info */}
                <div className="p-4">
                  <h3 className="font-semibold truncate mb-1">{playlist.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                    {playlist.isPublic && (
                      <>
                        {" • "}
                        <span className="text-primary">Public</span>
                      </>
                    )}
                  </p>
                  {playlist.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {playlist.description}
                    </p>
                  )}
                </div>

                {/* Actions Menu */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-black/60 hover:bg-black/80 rounded-full"
                      >
                        <MoreVertical className="h-4 w-4 text-white" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/playlists/${playlist.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistToEdit(playlist);
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistToDelete(playlist);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
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

