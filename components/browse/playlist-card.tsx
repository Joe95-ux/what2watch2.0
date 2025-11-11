"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Playlist } from "@/hooks/use-playlists";
import { getPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

interface PlaylistCardProps {
  playlist: Playlist;
  className?: string;
}

export default function PlaylistCard({ playlist, className }: PlaylistCardProps) {
  const router = useRouter();

  const getPlaylistCover = () => {
    if (playlist.coverImage) {
      return playlist.coverImage;
    }
    // Use first item's poster as cover if available
    if (playlist.items && playlist.items.length > 0) {
      const firstItem = playlist.items[0];
      if (firstItem.posterPath) {
        return getPosterUrl(firstItem.posterPath, "w500");
      }
    }
    return null;
  };

  const coverImage = getPlaylistCover();
  const itemCount = playlist._count?.items || playlist.items?.length || 0;
  const displayName = playlist.user?.displayName || playlist.user?.username || "Unknown";

  return (
    <div
      className={cn(
        "group relative flex-shrink-0 cursor-pointer",
        "transition-transform duration-300 hover:scale-105",
        className
      )}
      onClick={() => router.push(`/playlists/${playlist.id}/public`)}
    >
      <div className="relative w-[180px] sm:w-[200px] aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-colors">
        {/* Cover Image */}
        {coverImage ? (
          <Image
            src={coverImage}
            alt={playlist.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 180px, 200px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-muted-foreground text-sm text-center px-2">No Cover</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Playlist Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <h3 className="font-semibold text-white text-sm mb-1 line-clamp-1 drop-shadow-lg">
            {playlist.name}
          </h3>
          <p className="text-xs text-white/90 drop-shadow">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
          {playlist.user && (
            <p className="text-xs text-white/80 mt-1 drop-shadow">
              by {displayName}
            </p>
          )}
        </div>

        {/* Item Count Badge */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
          <span className="text-xs font-medium text-white">
            {itemCount}
          </span>
        </div>
      </div>

      {/* Title below card (visible on mobile, hidden on desktop where overlay shows) */}
      <div className="mt-2 md:hidden">
        <h3 className="font-semibold text-sm line-clamp-1">{playlist.name}</h3>
        <p className="text-xs text-muted-foreground">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
      </div>
    </div>
  );
}

