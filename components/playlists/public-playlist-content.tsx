"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Playlist } from "@/hooks/use-playlists";
import SharePlaylistDialog from "./share-playlist-dialog";
import CreatePlaylistModal from "./create-playlist-modal";
import ImportPlaylistModal from "./import-playlist-modal";
import PlaylistView from "./playlist-view";
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
import { useDeletePlaylist, useUpdatePlaylist } from "@/hooks/use-playlists";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { FollowButton } from "@/components/social/follow-button";
import { useLikePlaylist, useUnlikePlaylist, useIsLiked } from "@/hooks/use-playlist-likes";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type PlaylistWithUser = Playlist & {
  user?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
};

interface PublicPlaylistContentProps {
  playlistId: string;
}

export default function PublicPlaylistContent({ playlistId }: PublicPlaylistContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const deletePlaylist = useDeletePlaylist();
  const updatePlaylist = useUpdatePlaylist();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoggedVisit, setHasLoggedVisit] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/playlists/${playlistId}?public=true`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to load playlist");
          return;
        }
        const data = await res.json();
        setPlaylist(data.playlist);
        // Set current user ID from API response if authenticated
        if (data.currentUserId) {
          setCurrentUserId(data.currentUserId);
        } else {
          setCurrentUserId(null);
        }
      } catch (err) {
        setError("Failed to load playlist");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylist();
  }, [playlistId]);

  const playlistWithUser = playlist as PlaylistWithUser;
  const isOwner = Boolean(currentUserId && playlist && currentUserId === playlist.userId);

  // Redirect owner to regular playlist page for better UX (only if playlist is public)
  // For private playlists, owners can still view them here but we'll redirect for consistency
  useEffect(() => {
    if (isOwner && playlist && !isLoading) {
      router.replace(`/playlists/${playlist.id}`);
    }
  }, [isOwner, playlist, isLoading, router]);

  useEffect(() => {
    if (!playlist || hasLoggedVisit) {
      return;
    }

    const controller = new AbortController();

    const logVisit = async () => {
      try {
        await fetch("/api/analytics/playlist-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playlistId,
            type: "VISIT",
            source: "public_view",
          }),
          signal: controller.signal,
        });
        setHasLoggedVisit(true);
      } catch (logError) {
        if ((logError as Error).name !== "AbortError") {
          console.error("Failed to log playlist visit", logError);
        }
      }
    };

    logVisit();

    return () => controller.abort();
  }, [playlist, hasLoggedVisit, playlistId]);

  const handleTogglePublic = async (visibility: "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE") => {
    try {
      await updatePlaylist.mutateAsync({
        playlistId,
        updates: {
          isPublic: visibility === "PUBLIC",
        },
      });
      // Refetch playlist
      const res = await fetch(`/api/playlists/${playlistId}?public=true`);
      if (res.ok) {
        const data = await res.json();
        setPlaylist(data.playlist);
      }
    } catch (error) {
      toast.error("Failed to update playlist visibility");
      console.error(error);
      throw error;
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}/items/${itemId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove");
      toast.success("Removed from playlist");
      // Refetch playlist
      const res = await fetch(`/api/playlists/${playlistId}?public=true`);
      if (res.ok) {
        const data = await res.json();
        setPlaylist(data.playlist);
      }
    } catch (error) {
      toast.error("Failed to remove item");
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

  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/playlists/${playlistId}?public=true`
    : "";

  // Show loading/error states through PlaylistView
  if (isLoading || error || !playlist) {
    return (
      <PlaylistView
        playlist={null}
        playlistId={playlistId}
        isLoading={isLoading}
        isOwner={false}
        enableRemove={false}
        enableEdit={false}
        enableExport={false}
        enablePublicToggle={false}
        shareUrl={shareUrl}
        errorTitle={error === "Playlist is private" ? "Private Playlist" : "Playlist not found"}
        errorDescription={
          error === "Playlist is private"
            ? "This playlist is private and cannot be viewed."
            : error || "This playlist doesn't exist."
        }
        errorAction={
          <Button onClick={() => router.push("/browse")} className="cursor-pointer">
            Back to Browse
          </Button>
        }
        onBack={() => router.push("/playlists")}
      />
    );
  }

  return (
    <>
      <PlaylistView
        playlist={playlist}
        playlistId={playlistId}
        isLoading={isLoading}
        isOwner={isOwner}
        enableRemove={isOwner}
        enableEdit={isOwner}
        enableExport={isOwner}
        enablePublicToggle={isOwner}
        onTogglePublic={handleTogglePublic}
        onRemove={handleRemoveItem}
        shareUrl={shareUrl}
        onShare={() => setIsShareDialogOpen(true)}
        emptyTitle="This playlist is empty"
        emptyDescription="No items have been added yet."
        errorTitle="Playlist not found"
        errorDescription="This playlist doesn't exist or is private."
        onBack={() => router.push("/playlists")}
        isLiked={isLiked}
        onToggleLike={handleToggleLike}
        isLikeLoading={likePlaylist.isPending || unlikePlaylist.isPending}
        likeUserId={currentUserId}
        showLikeFollow={!isOwner && playlistWithUser.user && (playlist?.visibility === "PUBLIC" || playlist?.isPublic || playlist?.visibility === "FOLLOWERS_ONLY")}
      />

      {/* Share Dialog - Available for all users */}
      {playlist && (
        <SharePlaylistDialog
          playlist={playlist}
          isOpen={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          isOwnPlaylist={isOwner}
        />
      )}

      {/* Owner Modals/Dialogs */}
      {isOwner && playlist && (
        <>
          <CreatePlaylistModal
            isOpen={isEditModalOpen}
            onClose={() => {
              // Refetch playlist after edit
              fetch(`/api/playlists/${playlistId}?public=true`)
                .then((res) => res.json())
                .then((data) => {
                  if (data.playlist) {
                    setPlaylist(data.playlist);
                  }
                });
              setIsEditModalOpen(false);
            }}
            playlist={playlist}
          />
          <ImportPlaylistModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            playlistId={playlistId}
            onSuccess={() => {
              window.location.reload();
            }}
          />
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Playlist</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{playlist.name}&quot;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeletePlaylist}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}

