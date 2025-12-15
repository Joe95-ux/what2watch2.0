"use client";

import { useState, useMemo, useEffect } from "react";
import { useFollowingPlaylists } from "@/hooks/use-playlist-likes";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Film } from "lucide-react";
import { Playlist } from "@/hooks/use-playlists";
import PlaylistCard from "@/components/browse/playlist-card";

export default function FriendsPlaylistsContent() {
  const { data: playlists = [], isLoading } = useFollowingPlaylists();
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

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Friends&apos; Playlists</h1>
        <p className="text-muted-foreground">
          {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"} from users you follow
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-full">
              <Skeleton className="w-full h-[225px] rounded-lg mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-12">
          <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No playlists yet</h3>
          <p className="text-muted-foreground">
            Start following users to see their playlists here
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
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
    </div>
  );
}

