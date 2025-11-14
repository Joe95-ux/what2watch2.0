"use client";

import { useState, useMemo, useEffect } from "react";
import { useFollowingPlaylists } from "@/hooks/use-playlist-likes";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Grid3x3, Table2, ChevronLeft, ChevronRight, Film } from "lucide-react";
import { Playlist } from "@/hooks/use-playlists";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PlaylistCard from "@/components/browse/playlist-card";
import { getPosterUrl } from "@/lib/tmdb";

type ViewType = "grid" | "table";

export default function FriendsPlaylistsContent() {
  const { data: playlists = [], isLoading } = useFollowingPlaylists();
  const router = useRouter();
  const [viewType, setViewType] = useState<ViewType>("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  // Pagination
  const totalPages = useMemo(() => {
    return Math.ceil(playlists.length / itemsPerPage);
  }, [playlists.length, itemsPerPage]);

  const paginatedPlaylists = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return playlists.slice(startIndex, startIndex + itemsPerPage) as Playlist[];
  }, [playlists, currentPage, itemsPerPage]);

  // Reset to page 1 when playlists change
  useEffect(() => {
    setCurrentPage(1);
  }, [playlists.length]);

  const getPlaylistCover = (playlist: Playlist) => {
    if (playlist.coverImage) {
      return playlist.coverImage;
    }
    if (playlist.items && playlist.items.length > 0) {
      const firstItem = playlist.items[0];
      if (firstItem.posterPath) {
        return getPosterUrl(firstItem.posterPath, "w500");
      }
    }
    return null;
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Friends&apos; Playlists</h1>
          <p className="text-muted-foreground">
            {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"} from users you follow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewType === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewType("grid")}
            className="cursor-pointer"
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            Grid
          </Button>
          <Button
            variant={viewType === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewType("table")}
            className="cursor-pointer"
          >
            <Table2 className="h-4 w-4 mr-2" />
            Table
          </Button>
        </div>
      </div>

      {isLoading ? (
        viewType === "table" ? (
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
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="w-16 h-24 rounded" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
            ))}
          </div>
        )
      ) : playlists.length === 0 ? (
        <div className="text-center py-12">
          <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No playlists yet</h3>
          <p className="text-muted-foreground">
            Start following users to see their playlists here
          </p>
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
                {paginatedPlaylists.map((playlist: Playlist) => {
                  const coverImage = getPlaylistCover(playlist);
                  const itemCount = playlist._count?.items || playlist.items?.length || 0;
                  const authorName = playlist.user?.displayName || playlist.user?.username || "Unknown";
                  return (
                    <TableRow
                      key={playlist.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/playlists/${playlist.id}/public`)}
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
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">No Cover</span>
                            </div>
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
            <div className="flex items-center justify-center gap-2 mt-6">
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
            {paginatedPlaylists.map((playlist: Playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                variant="grid"
                showLikeButton={true}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
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
    </div>
  );
}

