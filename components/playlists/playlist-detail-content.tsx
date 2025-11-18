"use client";

import { useState, useMemo, useEffect } from "react";
import { usePlaylist, useDeletePlaylist, useRemoveItemFromPlaylist, type Playlist } from "@/hooks/use-playlists";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Trash2, MoreVertical, X, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import CreatePlaylistModal from "./create-playlist-modal";
import SharePlaylistDialog from "./share-playlist-dialog";
import { FollowButton } from "@/components/social/follow-button";
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
import { getPosterUrl } from "@/lib/tmdb";

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
  const { data: playlist, isLoading } = usePlaylist(playlistId);
  const deletePlaylist = useDeletePlaylist();
  const removeItem = useRemoveItemFromPlaylist();
  const router = useRouter();
  
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
  const [itemToRemove, setItemToRemove] = useState<{ itemId: string; title: string } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Check if playlist is owned by current user
  const isOwnPlaylist = useMemo(() => {
    if (!playlist) return false;
    // Use the currentUserId from the API response if available, otherwise fallback to comparison
    const playlistWithUser = playlist as PlaylistWithCurrentUser;
    const currentUserId = playlistWithUser._currentUserId;
    if (currentUserId) {
      return playlist.userId === currentUserId;
    }
    // Fallback: this shouldn't happen in normal flow
    return false;
  }, [playlist]);

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

  const handleRemoveItem = async () => {
    if (!itemToRemove) return;

    try {
      await removeItem.mutateAsync({
        playlistId,
        itemId: itemToRemove.itemId,
      });
      toast.success(`Removed ${itemToRemove.title} from playlist`);
      setItemToRemove(null);
    } catch (error) {
      toast.error("Failed to remove item");
      console.error(error);
    }
  };

  // Convert playlist items to TMDB format - must be before early returns
  const itemsAsTMDB = useMemo(() => {
    if (!playlist) return [];
    return (playlist.items || []).map((playlistItem) => {
      if (playlistItem.mediaType === "movie") {
        const movie: TMDBMovie = {
          id: playlistItem.tmdbId,
          title: playlistItem.title,
          overview: "",
          poster_path: playlistItem.posterPath,
          backdrop_path: playlistItem.backdropPath,
          release_date: playlistItem.releaseDate || "",
          vote_average: 0,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          adult: false,
          original_language: "",
          original_title: playlistItem.title,
        };
        return { item: movie, type: "movie" as const, playlistItemId: playlistItem.id };
      } else {
        const tv: TMDBSeries = {
          id: playlistItem.tmdbId,
          name: playlistItem.title,
          overview: "",
          poster_path: playlistItem.posterPath,
          backdrop_path: playlistItem.backdropPath,
          first_air_date: playlistItem.firstAirDate || "",
          vote_average: 0,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          original_language: "",
          original_name: playlistItem.title,
        };
        return { item: tv, type: "tv" as const, playlistItemId: playlistItem.id };
      }
    });
  }, [playlist]);

  const itemsPerPage = 24;
  const totalPages = useMemo(() => {
    return itemsAsTMDB.length > 0 ? Math.ceil(itemsAsTMDB.length / itemsPerPage) : 1;
  }, [itemsAsTMDB.length, itemsPerPage]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return itemsAsTMDB.slice(startIndex, startIndex + itemsPerPage);
  }, [itemsAsTMDB, currentPage, itemsPerPage]);

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    if (currentPage >= totalPages - 2) {
      return Array.from({ length: maxButtons }, (_, i) => totalPages - 4 + i);
    }
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [playlistId]);

  useEffect(() => {
    const maxPage = itemsAsTMDB.length > 0 ? Math.ceil(itemsAsTMDB.length / itemsPerPage) : 1;
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [itemsAsTMDB.length, currentPage, itemsPerPage]);

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <Skeleton className="h-48 w-full mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Playlist not found</h2>
          <p className="text-muted-foreground mb-4">This playlist doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Button onClick={() => router.push("/playlists")} className="cursor-pointer">Back to Playlists</Button>
        </div>
      </div>
    );
  }

  const playlistWithUser = playlist as PlaylistWithUser;

  const coverImage = playlist.coverImage
    ? playlist.coverImage
    : itemsAsTMDB.length > 0 && itemsAsTMDB[0].item.poster_path
    ? getPosterUrl(itemsAsTMDB[0].item.poster_path, "original")
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Cover */}
      <div className="relative -mt-[65px] h-[60vh] min-h-[300px] max-h-[75vh] overflow-hidden">
        {coverImage ? (
          <>
            <img
              src={coverImage}
              alt={playlist.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}

        <div className="absolute inset-0 flex items-end">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/playlists")}
                  className="mb-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{playlist.name}</h1>
                {playlist.description && (
                  <p className="text-base sm:text-lg text-muted-foreground mb-4 max-w-2xl">
                    {playlist.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {itemsAsTMDB.length} {itemsAsTMDB.length === 1 ? "item" : "items"}
                  </span>
                  {playlist.isPublic && (
                    <>
                      <span>•</span>
                      <span className="text-primary">Public</span>
                    </>
                  )}
                  {playlistWithUser.user && (
                    <>
                      <span>•</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/users/${playlistWithUser.user?.id}`);
                        }}
                        className="hover:text-primary transition-colors cursor-pointer"
                      >
                        By {playlistWithUser.user.displayName || playlistWithUser.user.username || "Unknown"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 ml-auto sm:ml-0">
                {isOwnPlaylist ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsShareDialogOpen(true)}
                      className="gap-2 cursor-pointer"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="cursor-pointer">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setIsDeleteDialogOpen(true)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  playlistWithUser.user && (
                    <>
                      <FollowButton userId={playlistWithUser.user.id} />
                      <Button
                        variant="outline"
                        onClick={() => setIsShareDialogOpen(true)}
                        className="gap-2 cursor-pointer"
                      >
                        <Share2 className="h-4 w-4" />
                        Share
                      </Button>
                    </>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {itemsAsTMDB.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">This playlist is empty.</p>
            <Button onClick={() => router.push("/browse")} className="cursor-pointer">Browse Content</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {paginatedItems.map(({ item, type, playlistItemId }) => (
              <div key={playlistItemId} className="relative group">
                <MovieCard
                  item={item}
                  type={type}
                  onCardClick={(clickedItem, clickedType) => setSelectedItem({ item: clickedItem, type: clickedType })}
                />
                {isOwnPlaylist && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 rounded-full h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      const title = "title" in item ? item.title : item.name;
                      setItemToRemove({
                        itemId: playlistItemId,
                        title,
                      });
                    }}
                  >
                    <X className="h-4 w-4 text-white" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        {itemsAsTMDB.length > 0 && totalPages > 1 && (
          <div className="mt-8 w-full">
            <div className="flex items-center justify-center gap-2 overflow-auto max-w-full px-2 py-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1 overflow-x-auto max-w-full">
                {pageNumbers.map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="min-w-[40px] flex-shrink-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex-shrink-0"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Playlist Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{playlist.name}</strong>? This action cannot be undone and all items in the playlist will be removed.
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

      {/* Remove Item Dialog */}
      <AlertDialog open={!!itemToRemove} onOpenChange={(open) => !open && setItemToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Playlist?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{itemToRemove?.title}</strong> from this playlist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveItem}
              disabled={removeItem.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeItem.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Modal */}
      <CreatePlaylistModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        playlist={playlist}
      />

      {/* Share Dialog */}
      {playlist && (
        <SharePlaylistDialog
          playlist={playlist}
          isOpen={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          isOwnPlaylist={isOwnPlaylist}
        />
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <ContentDetailModal
          item={selectedItem.item}
          type={selectedItem.type}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

