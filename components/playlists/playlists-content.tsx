"use client";

import { useState, useMemo, useEffect } from "react";
import { usePlaylists, useDeletePlaylist, type Playlist } from "@/hooks/use-playlists";
import { useLikedPlaylists } from "@/hooks/use-playlist-likes";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Plus, Grid3x3, Table2, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CreatePlaylistModal from "./create-playlist-modal";
import PlaylistCard from "@/components/browse/playlist-card";
import { getPosterUrl } from "@/lib/tmdb";

type FilterType = "all" | "created" | "shared";
type ViewType = "grid" | "table";

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
  const [viewType, setViewType] = useState<ViewType>("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

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
    const own = ownPlaylists.map((p: Playlist) => ({ ...p, isOwn: true, isLiked: false }));
    const liked = likedPlaylists.map((p: Playlist) => ({ ...p, isOwn: false, isLiked: true }));
    
    // Remove duplicates (if a playlist is both own and liked, prioritize own)
    const playlistMap = new Map<string, Playlist & { isOwn: boolean; isLiked: boolean }>();
    
    // Add own playlists first
    own.forEach((p: Playlist & { isOwn: boolean; isLiked: boolean }) => playlistMap.set(p.id, p));
    
    // Add liked playlists (won't overwrite own)
    liked.forEach((p: Playlist & { isOwn: boolean; isLiked: boolean }) => {
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
        // For now, shared means liked playlists. In future, this will be collaborative playlists
        return allPlaylists.filter((p) => p.isLiked && !p.isOwn);
      default:
        return allPlaylists;
    }
  }, [allPlaylists, filter, clerkUser?.id]);

  // Pagination
  const totalPages = useMemo(() => {
    return Math.ceil(filteredPlaylists.length / itemsPerPage);
  }, [filteredPlaylists.length, itemsPerPage]);

  const paginatedPlaylists = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPlaylists.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPlaylists, currentPage, itemsPerPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const getPlaylistCover = (playlist: Playlist) => {
    if (playlist.coverImage) {
      return playlist.coverImage;
    }
    
    // Combine both regular items and YouTube items, sorted by order
    const allItems: Array<{ order: number; posterPath?: string | null; thumbnail?: string | null }> = [];
    
    // Add regular items
    if (playlist.items && playlist.items.length > 0) {
      playlist.items.forEach(item => {
        allItems.push({
          order: item.order,
          posterPath: item.posterPath,
        });
      });
    }
    
    // Add YouTube items
    if (playlist.youtubeItems && playlist.youtubeItems.length > 0) {
      playlist.youtubeItems.forEach(item => {
        allItems.push({
          order: item.order,
          thumbnail: item.thumbnail,
        });
      });
    }
    
    // Sort by order and find the first item with a cover
    allItems.sort((a, b) => a.order - b.order);
    
    for (const item of allItems) {
      // Prefer regular item poster if available
      if (item.posterPath) {
        return getPosterUrl(item.posterPath, "w500");
      }
      // Fall back to YouTube thumbnail if no poster
      if (item.thumbnail) {
        return item.thumbnail;
      }
    }
    
    return null;
  };

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

      {/* Filter Tabs and View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="created">By you</TabsTrigger>
            <TabsTrigger value="shared">Shared</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button
            variant={viewType === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewType("grid")}
            className="cursor-pointer"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewType === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewType("table")}
            className="cursor-pointer"
          >
            <Table2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Playlists Content */}
      {isLoading ? (
        viewType === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )
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
              ? "Shared playlists (collaborative playlists with editing rights) will appear here."
              : "Create your first playlist or like playlists from other users."}
          </p>
          {filter === "created" && (
            <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4 cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              Create Playlist
            </Button>
          )}
        </div>
      ) : viewType === "table" ? (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Poster</TableHead>
                  <TableHead>Playlist Name</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPlaylists.map((playlist) => {
                  const coverImage = getPlaylistCover(playlist);
                  const itemCount = (playlist._count?.items || playlist.items?.length || 0) + (playlist._count?.youtubeItems || playlist.youtubeItems?.length || 0);
                  const authorName = playlist.user?.displayName || playlist.user?.username || "Unknown";
                  const isYouTubeThumbnail = coverImage?.includes("i.ytimg.com") || coverImage?.includes("img.youtube.com");
                  return (
                    <TableRow
                      key={playlist.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/playlists/${playlist.id}`)}
                    >
                      <TableCell>
                        <div className="relative w-16 h-24 rounded overflow-hidden bg-muted">
                          {coverImage ? (
                            <Image
                              src={coverImage}
                              alt={playlist.name}
                              fill
                              className="object-cover"
                              sizes="64px"
                              unoptimized={isYouTubeThumbnail}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-pink-500/30" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{playlist.name}</TableCell>
                      <TableCell>{authorName}</TableCell>
                      <TableCell className="text-right">{itemCount}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 w-full overflow-auto px-2 py-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {paginatedPlaylists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                showLikeButton={!playlist.isOwn}
                variant="grid"
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 w-full overflow-auto px-2 py-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
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

