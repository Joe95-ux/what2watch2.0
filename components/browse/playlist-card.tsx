"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Playlist } from "@/hooks/use-playlists";
import { getPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { useIsLiked, useLikePlaylist, useUnlikePlaylist } from "@/hooks/use-playlist-likes";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Heart, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PlaylistCardProps {
  playlist: Playlist;
  className?: string;
  showLikeButton?: boolean;
  variant?: "carousel" | "grid";
}

export default function PlaylistCard({ playlist, className, showLikeButton = true, variant = "carousel" }: PlaylistCardProps) {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const { data: likeStatus } = useIsLiked(playlist.id);
  const likeMutation = useLikePlaylist();
  const unlikeMutation = useUnlikePlaylist();
  
  const isLiked = likeStatus?.isLiked ?? false;
  const isOwner = currentUser && playlist.userId === currentUser.id;
  const canLike = showLikeButton && !isOwner && playlist.user;

  const handleCardClick = () => {
    // If user is the owner, route to the regular playlist page (works for both public and private)
    // Otherwise, route to the public page
    if (isOwner) {
      router.push(`/playlists/${playlist.id}`);
    } else {
      router.push(`/playlists/${playlist.id}/public`);
    }
  };

  const getPlaylistCover = () => {
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

  const coverImage = getPlaylistCover();
  const itemCount = (playlist._count?.items || playlist.items?.length || 0) + (playlist._count?.youtubeItems || playlist.youtubeItems?.length || 0);
  const displayName = playlist.user?.displayName || playlist.user?.username || "Unknown";
  
  // Check if coverImage is a YouTube thumbnail URL
  const isYouTubeThumbnail = coverImage?.includes("i.ytimg.com") || coverImage?.includes("img.youtube.com");

  return (
    <div
      className={cn(
        "group relative cursor-pointer",
        variant === "carousel" && "flex-shrink-0 w-[180px] sm:w-[200px]",
        variant === "grid" && "w-full",
        className
      )}
      onClick={handleCardClick}
    >
      <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-colors">
        {/* Cover Image */}
        {coverImage ? (
          <Image
            src={coverImage}
            alt={playlist.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 180px, 200px"
            unoptimized={isYouTubeThumbnail}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-pink-500/30 flex items-center justify-center">
            {/* Show YouTube icon if playlist has YouTube items, otherwise show first letter of playlist name */}
            {playlist.youtubeItems && playlist.youtubeItems.length > 0 ? (
              <Youtube className="h-12 w-12 text-white/60" />
            ) : (
              <span className="text-4xl font-bold text-white/60">
                {playlist.name.charAt(0).toUpperCase()}
              </span>
            )}
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/users/${playlist.user?.id}`);
              }}
              className="text-xs text-white/80 mt-1 drop-shadow hover:text-white transition-colors cursor-pointer"
            >
              by {displayName}
            </button>
          )}
        </div>

        {/* Item Count Badge */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
          <span className="text-xs font-medium text-white">
            {itemCount}
          </span>
        </div>

        {/* Like Button */}
        {canLike && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm border-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (isLiked) {
                  unlikeMutation.mutate(playlist.id, {
                    onSuccess: () => toast.success("Removed from your library"),
                    onError: () => toast.error("Failed to remove playlist"),
                  });
                } else {
                  likeMutation.mutate(playlist.id, {
                    onSuccess: () => toast.success("Added to your library"),
                    onError: () => toast.error("Failed to add playlist"),
                  });
                }
              }}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  isLiked ? "fill-red-500 text-red-500" : "text-white"
                )}
              />
            </Button>
          </div>
        )}
      </div>

      {/* Title below card (visible on mobile, hidden on desktop where overlay shows) */}
      <div className="mt-2 md:hidden">
        <h3 className="font-semibold text-sm line-clamp-1">{playlist.name}</h3>
        <p className="text-xs text-muted-foreground">
          {itemCount} {itemCount === 1 ? "item" : "items"}
          {playlist.user && (
            <>
              {" • "}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/users/${playlist.user?.id}`);
                }}
                className="hover:text-foreground transition-colors cursor-pointer"
              >
                by {displayName}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

