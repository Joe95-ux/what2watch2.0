"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePlaylist, useDeletePlaylist, useRemoveItemFromPlaylist, useUpdatePlaylist, type Playlist } from "@/hooks/use-playlists";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import CreatePlaylistModal from "./create-playlist-modal";
import SharePlaylistDialog from "./share-playlist-dialog";
import ImportPlaylistModal from "./import-playlist-modal";
import PlaylistView from "./playlist-view";
import { useLikePlaylist, useUnlikePlaylist, useIsLiked } from "@/hooks/use-playlist-likes";
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

interface PlaylistDetailContentProps {
  playlistId: string;
}

type PlaylistWithUser = Playlist & {
  user?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
};

type PlaylistWithCurrentUser = Playlist & {
  _currentUserId?: string;
};

export default function PlaylistDetailContent({ playlistId }: PlaylistDetailContentProps) {
  const queryClient = useQueryClient();
  const { data: playlist, isLoading } = usePlaylist(playlistId);
  const deletePlaylist = useDeletePlaylist();
  const removeItem = useRemoveItemFromPlaylist();
  const updatePlaylist = useUpdatePlaylist();
  const router = useRouter();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Get current user ID from playlist
  const currentUserId = useMemo(() => {
    if (!playlist) return null;
    const playlistWithUser = playlist as PlaylistWithCurrentUser;
    return playlistWithUser._currentUserId || null;
  }, [playlist]);

  // Check if playlist is owned by current user
  const isOwnPlaylist = useMemo(() => {
    if (!playlist || !currentUserId) return false;
    return playlist.userId === currentUserId;
  }, [playlist, currentUserId]);

  // Like functionality
  const { data: likeStatus } = useIsLiked(playlist?.id || null);
  const likePlaylist = useLikePlaylist();
  const unlikePlaylist = useUnlikePlaylist();
  const isLiked = likeStatus?.isLiked || false;

  const handleToggleLike = async () => {
    if (!playlist || !currentUserId) return;
    try {
      if (isLiked) {
        await unlikePlaylist.mutateAsync(playlist.id);
        toast.success("Removed from liked playlists");
      } else {
        await likePlaylist.mutateAsync(playlist.id);
        toast.success("Added to liked playlists");
      }
    } catch (error) {
      toast.error("Failed to update like status");
      console.error(error);
    }
  };

  const handleDeletePlaylist = async () => {
    try {
      await deletePlaylist.mutateAsync(playlistId);
      toast.success("Playlist deleted");
      router.push("/playlists");
    } catch (error) {
      toast.error("Failed to delete playlist");
      console.error(error);
    }
  };

  const handleRemoveItem = async (itemId: string, suppressToast = false) => {
    try {
      await removeItem.mutateAsync({
        playlistId,
        itemId,
      });
      if (!suppressToast) {
        toast.success("Removed from playlist");
      }
    } catch (error) {
      toast.error("Failed to remove item");
      console.error(error);
    }
  };

  const handleTogglePublic = async (visibility: "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE") => {
    try {
      await updatePlaylist.mutateAsync({
        playlistId,
        updates: {
          isPublic: visibility === "PUBLIC",
        },
      });
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
    } catch (error) {
      toast.error("Failed to update playlist visibility");
      console.error(error);
      throw error;
    }
  };

  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/playlists/${playlistId}?public=true`
    : "";

  // Clean playlist object without _currentUserId for PlaylistView
  const cleanPlaylist = playlist ? (() => {
    const { _currentUserId, ...rest } = playlist as Playlist & { _currentUserId?: string };
    return rest as Playlist;
  })() : null;

  // Determine if we should show like/follow buttons
  const playlistWithUser = cleanPlaylist as PlaylistWithUser;
  const showLikeFollow = !isOwnPlaylist && playlistWithUser?.user && 
    (cleanPlaylist?.visibility === "PUBLIC" || cleanPlaylist?.isPublic || cleanPlaylist?.visibility === "FOLLOWERS_ONLY");

  return (
    <>
      <PlaylistView
        playlist={cleanPlaylist}
        playlistId={playlistId}
        isLoading={isLoading}
        isOwner={isOwnPlaylist}
        enableRemove={isOwnPlaylist}
        enableEdit={isOwnPlaylist}
        enableExport={isOwnPlaylist}
        enablePublicToggle={isOwnPlaylist}
        onTogglePublic={handleTogglePublic}
        onRemove={handleRemoveItem}
        shareUrl={shareUrl}
        onShare={() => setIsShareDialogOpen(true)}
        emptyTitle="This playlist is empty"
        emptyDescription="No items have been added yet."
        emptyAction={
          <Button onClick={() => router.push("/browse")} className="cursor-pointer">
            Browse Content
          </Button>
        }
        errorTitle="Playlist not found"
        errorDescription="This playlist doesn't exist or you don't have access to it."
        errorAction={
          <Button onClick={() => router.push("/playlists")} className="cursor-pointer">
            Back to Playlists
          </Button>
        }
        onBack={() => router.push("/playlists")}
        isLiked={isLiked}
        onToggleLike={handleToggleLike}
        isLikeLoading={likePlaylist.isPending || unlikePlaylist.isPending}
        likeUserId={currentUserId}
        showLikeFollow={showLikeFollow}
      />

      {/* Delete Playlist Dialog */}
      {isOwnPlaylist && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Playlist?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{playlist?.name}</strong>? This action cannot be undone and all items in the playlist will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePlaylist}
                disabled={deletePlaylist.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletePlaylist.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Edit Modal */}
      {isOwnPlaylist && playlist && (
        <>
          <CreatePlaylistModal
            isOpen={isEditModalOpen}
            onClose={() => {
              queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
              setIsEditModalOpen(false);
            }}
            playlist={playlist}
          />
          <ImportPlaylistModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            playlistId={playlistId}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
            }}
          />
        </>
      )}

      {/* Share Dialog */}
      {playlist && (
        <SharePlaylistDialog
          playlist={playlist}
          isOpen={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          isOwnPlaylist={isOwnPlaylist}
        />
      )}
    </>
  );
}

