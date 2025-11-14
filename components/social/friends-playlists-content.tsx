"use client";

import { useFollowingPlaylists } from "@/hooks/use-playlist-likes";
import { Skeleton } from "@/components/ui/skeleton";
import PlaylistRow from "@/components/browse/playlist-row";
import { Film } from "lucide-react";
import { Playlist } from "@/hooks/use-playlists";

export default function FriendsPlaylistsContent() {
  const { data: playlists = [], isLoading } = useFollowingPlaylists();

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Friends&apos; Playlists</h1>
          <p className="text-muted-foreground mt-2">
            Discover playlists from users you follow
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[3/4] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Friends&apos; Playlists</h1>
          <p className="text-muted-foreground mt-2">
            Discover playlists from users you follow
          </p>
        </div>
        <div className="text-center py-12">
          <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No playlists yet</h3>
          <p className="text-muted-foreground">
            Start following users to see their playlists here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Friends&apos; Playlists</h1>
        <p className="text-muted-foreground mt-2">
          Discover playlists from users you follow
        </p>
      </div>
      <PlaylistRow title="" playlists={playlists as Playlist[]} href="/playlists" />
    </div>
  );
}

