"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Playlist } from "@/hooks/use-playlists";
import { getPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { useIsLiked, useLikePlaylist, useUnlikePlaylist } from "@/hooks/use-playlist-likes";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Heart, Youtube, List as ListIcon } from "lucide-react";
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

  const getPlaylistPosters = () => {
    const posters: Array<{ url: string; isYouTube: boolean }> = [];
    
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
    
    // Sort by order and get first 3 items with covers
    allItems.sort((a, b) => a.order - b.order);
    
    // Continue through all items until we find 3 with valid posters
    for (const item of allItems) {
      if (posters.length >= 3) break;
      
      // Prefer regular item poster if available (check for non-null, non-empty string)
      if (item.posterPath && item.posterPath.trim() !== "") {
        posters.push({
          url: getPosterUrl(item.posterPath, "w500"),
          isYouTube: false,
        });
      } else if (item.thumbnail && item.thumbnail.trim() !== "") {
        // Fall back to YouTube thumbnail (check for non-null, non-empty string)
        posters.push({
          url: item.thumbnail,
          isYouTube: true,
        });
      }
      // If neither posterPath nor thumbnail is available, skip this item and continue
    }
    
    return posters;
  };

  const posters = getPlaylistPosters();
  const itemCount = (playlist._count?.items || playlist.items?.length || 0) + (playlist._count?.youtubeItems || playlist.youtubeItems?.length || 0);
  const displayName = playlist.user?.displayName || playlist.user?.username || "Unknown";

  return (
    <div
      className={cn(
        "group relative cursor-pointer",
        variant === "carousel" && "flex-shrink-0 w-full",
        variant === "grid" && "w-full",
        className
      )}
      onClick={handleCardClick}
    >
      <div className="relative w-full h-[225px] rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-colors">
        {/* Grid of 3 Posters */}
        {posters.length > 0 ? (
          <div className="relative w-full h-[225px] grid grid-cols-3 gap-1">
            {posters.map((poster, index) => {
              // Border radius: first (left), middle (none), third (right)
              const borderRadiusClass = 
                index === 0 ? "rounded-tl-lg rounded-bl-lg" :
                index === 2 ? "rounded-tr-lg rounded-br-lg" :
                "";
              
              return (
                <div
                  key={index}
                  className={`relative w-full h-full overflow-hidden bg-muted ${borderRadiusClass}`}
                >
                  <Image
                    src={poster.url}
                    alt={`${playlist.name} - Item ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 120px, (max-width: 1024px) 150px, 200px"
                    quality={90}
                    unoptimized={poster.isYouTube}
                  />
                </div>
              );
            })}
            {/* Fill remaining slots if less than 3 posters */}
            {posters.length < 3 && Array.from({ length: 3 - posters.length }).map((_, index) => {
              const actualIndex = posters.length + index;
              const borderRadiusClass = 
                actualIndex === 0 ? "rounded-tl-lg rounded-bl-lg" :
                actualIndex === 2 ? "rounded-tr-lg rounded-br-lg" :
                "";
              
              return (
                <div
                  key={`empty-${index}`}
                  className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center ${borderRadiusClass}`}
                >
                  <span className="text-muted-foreground text-xs">No Cover</span>
                </div>
              );
            })}
          </div>
        ) : playlist.coverImage ? (
          <div className="relative w-full h-[225px]">
            <Image
              src={playlist.coverImage}
              alt={playlist.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110 rounded-lg"
              sizes="(max-width: 640px) 180px, 200px"
              quality={90}
            />
          </div>
        ) : (
          <div className="w-full h-[225px] flex items-center justify-center bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-lg">
            {playlist.youtubeItems && playlist.youtubeItems.length > 0 ? (
              <Youtube className="h-12 w-12 text-white/60" />
            ) : (
              <span className="text-4xl font-bold text-white/60">
                {playlist.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        )}

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-lg" />

        {/* Playlist Icon and Text - Bottom Left */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
          <ListIcon className="h-6 w-6 text-white" />
          <span className="text-sm font-medium text-white">Playlist</span>
        </div>

        {/* Item Count Badge */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 z-10">
          <span className="text-xs font-medium text-white">
            {itemCount}
          </span>
        </div>

        {/* Like Button */}
        {canLike && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
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

      {/* Title below card - Only title, no metadata */}
      <div className="mt-2">
        <h3 className="text-[16px] font-semibold line-clamp-1">{playlist.name}</h3>
      </div>
    </div>
  );
}

