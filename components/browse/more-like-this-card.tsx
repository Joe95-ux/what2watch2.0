"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Play, Plus, Heart, Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries, getPosterUrl } from "@/lib/tmdb";
import { CircleActionButton } from "./circle-action-button";
import { useToggleFavorite } from "@/hooks/use-favorites";
import { useToggleWatchlist } from "@/hooks/use-watchlist";
import AddToPlaylistDropdown from "@/components/playlists/add-to-playlist-dropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";

interface MoreLikeThisCardProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  parentItem?: TMDBMovie | TMDBSeries;
  parentType?: "movie" | "tv";
  onItemClick?: (item: TMDBMovie | TMDBSeries, itemType: "movie" | "tv") => void;
  showTypeBadge?: boolean; // Show TV/Movies badge when filter is "all"
  className?: string;
  onAddToPlaylist?: () => void;
}

export default function MoreLikeThisCard({
  item,
  type,
  parentItem,
  parentType,
  onItemClick,
  showTypeBadge = false,
  className,
  onAddToPlaylist,
}: MoreLikeThisCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [runtime, setRuntime] = useState<number | null>(null);
  const [isLoadingRuntime, setIsLoadingRuntime] = useState(false);
  const attemptedRuntimeFetchRef = useRef<number | null>(null); // Track which item ID we've attempted to fetch
  const toggleFavorite = useToggleFavorite();
  const toggleWatchlist = useToggleWatchlist();
  const isMobile = useIsMobile();
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const [playlistTooltipOpen, setPlaylistTooltipOpen] = useState(false);
  const [isPlaylistDropdownOpen, setIsPlaylistDropdownOpen] = useState(false);
  
  const hasParent = !!parentItem && !!parentType;

  const title = "title" in item ? item.title : item.name;
  const posterPath = item.poster_path || item.backdrop_path;
  const releaseDate = type === "movie" ? (item as TMDBMovie).release_date : (item as TMDBSeries).first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  
  // Format runtime helper
  const formatRuntime = (minutes: number | null | undefined) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };
  
  // Get runtime from item if available, otherwise fetch on hover
  const initialRuntime = type === "movie" 
    ? (item as TMDBMovie & { runtime?: number }).runtime 
    : (item as TMDBSeries & { episode_run_time?: number[] }).episode_run_time?.[0];
  
  const runtimeText = formatRuntime(runtime || initialRuntime);
  
  // Get parental rating - TMDB doesn't always provide this, so we'll use a simple fallback
  const parentalRating = type === "movie" 
    ? ((item as TMDBMovie).adult ? "R" : "PG-13")
    : "TV-MA";

  // Reset fetch attempt tracking when item changes
  useEffect(() => {
    if (attemptedRuntimeFetchRef.current !== item.id) {
      attemptedRuntimeFetchRef.current = null;
      setRuntime(null);
    }
  }, [item.id]);

  // Fetch runtime if not available
  useEffect(() => {
    // Only fetch if:
    // 1. We don't have initial runtime
    // 2. We don't have runtime yet
    // 3. We're not currently loading
    // 4. We haven't already attempted to fetch for this item (prevents infinite loops)
    if (!initialRuntime && !runtime && !isLoadingRuntime && attemptedRuntimeFetchRef.current !== item.id) {
      attemptedRuntimeFetchRef.current = item.id;
      setIsLoadingRuntime(true);
      fetch(`/api/${type === "movie" ? "movies" : "tv"}/${item.id}`)
        .then((res) => {
          if (!res.ok) {
            // Request failed - mark as attempted so we don't retry
            attemptedRuntimeFetchRef.current = item.id;
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data) {
            if (type === "movie" && data.runtime) {
              setRuntime(data.runtime);
            } else if (type === "tv" && data.episode_run_time?.[0]) {
              setRuntime(data.episode_run_time[0]);
            } else {
              // No runtime found - mark as attempted so we don't retry
              attemptedRuntimeFetchRef.current = item.id;
            }
          }
        })
        .catch((error) => {
          console.error("Error fetching runtime:", error);
          // Request failed - mark as attempted so we don't retry
          attemptedRuntimeFetchRef.current = item.id;
        })
        .finally(() => setIsLoadingRuntime(false));
    }
  }, [item.id, type, initialRuntime, runtime, isLoadingRuntime]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Only navigate if click is directly on the card, not on action buttons or dropdowns
    const target = e.target as HTMLElement;
    if (
      !target.closest('button') && 
      !target.closest('[role="button"]') && 
      !target.closest('[data-radix-dropdown-trigger]') &&
      !target.closest('[data-radix-dropdown-content]') &&
      !target.closest('[data-radix-tooltip-trigger]') &&
      !target.closest('[data-radix-tooltip-content]')
    ) {
      // Always navigate to the details page, regardless of callbacks
      router.push(`/${type}/${item.id}`);
    }
  };

  const promptSignIn = useCallback(
    (message?: string) => {
      toast.error(message ?? "Please sign in to perform this action.");
      if (openSignIn) {
        openSignIn({
          afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
        });
      }
    },
    [openSignIn]
  );

  const requireAuth = useCallback(
    async (action: () => Promise<void> | void, message?: string) => {
      if (!isSignedIn) {
        promptSignIn(message);
        return;
      }
      return action();
    },
    [isSignedIn, promptSignIn]
  );

  return (
    <>
      <div
        className={cn("relative bg-card rounded-lg overflow-hidden cursor-pointer group", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleCardClick}
      >
        {/* Section 1: Movie Poster - Reduced height */}
        <div className="relative aspect-[5/5] bg-muted overflow-hidden border-b border-border/50">
          {posterPath ? (
            <Image
              src={getPosterUrl(posterPath, "w500")}
              alt={title}
              fill
              className={`object-cover transition-transform duration-500 ease-out ${
                isHovered ? "scale-110" : "scale-100"
              }`}
              sizes="(max-width: 640px) 200px, 300px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No Image</span>
            </div>
          )}

          {/* Like and Watchlist Buttons - Top Left */}
          <div className="absolute top-2 left-2 z-[5] flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <CircleActionButton
                  size="sm"
                  onClick={async (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await requireAuth(
                      () => toggleFavorite.toggle(item, type),
                      "Sign in to like titles."
                    );
                  }}
                >
                  <Heart 
                    className={`h-3 w-3 ${
                      toggleFavorite.isFavorite(item.id, type)
                        ? "text-red-500 fill-red-500"
                        : "text-white"
                    }`} 
                  />
                </CircleActionButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>{toggleFavorite.isFavorite(item.id, type) ? "Remove from My List" : "Add to My List"}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <CircleActionButton
                  size="sm"
                  onClick={async (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await requireAuth(
                      () => toggleWatchlist.toggle(item, type),
                      "Sign in to manage your watchlist."
                    );
                  }}
                >
                  <Bookmark 
                    className={`h-3 w-3 ${
                      toggleWatchlist.isInWatchlist(item.id, type)
                        ? "text-blue-500 fill-blue-500"
                        : "text-white"
                    }`} 
                  />
                </CircleActionButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>{toggleWatchlist.isInWatchlist(item.id, type) ? "Remove from Watchlist" : "Add to Watchlist"}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Runtime - Top Right */}
          {runtimeText && (
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-medium z-[5]">
              {runtimeText}
            </div>
          )}

          {/* Type Badge - Bottom Left (when filter is "all") */}
          {showTypeBadge && (
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-medium z-[5]">
              {type === "movie" ? "Movie" : "TV"}
            </div>
          )}

          {/* Centered Play Button - Revealed on hover with animation */}
          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
              isHovered || isMobile ? "opacity-100" : "opacity-0"
            }`}
          >
            {!isMobile && <div className="bg-black/40 backdrop-blur-sm absolute inset-0" />}
            <CircleActionButton
              size="lg"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                // Navigate to details page
                router.push(`/${type}/${item.id}`);
              }}
              className="pointer-events-auto z-[5]"
            >
              <Play className="size-6 text-white fill-white" />
            </CircleActionButton>
          </div>
        </div>

        {/* Section 2: Movie Details */}
        <div className="bg-muted/60 dark:bg-card border-t border-border/50 p-3 space-y-2">
          {/* Top Row: Release Date + Parental Control + Add Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {year && <span>{year}</span>}
              {year && <span>•</span>}
              <span className="px-1.5 py-0.5 bg-muted rounded text-xs font-medium">
                {parentalRating}
              </span>
            </div>
            <Tooltip
              open={playlistTooltipOpen && !isPlaylistDropdownOpen}
              onOpenChange={(open) => setPlaylistTooltipOpen(open)}
            >
              <TooltipTrigger asChild>
                {isSignedIn ? (
                  <div>
                    <AddToPlaylistDropdown
                      item={item}
                      type={type}
                      onAddSuccess={onAddToPlaylist}
                      onOpenChange={(open) => {
                        setIsPlaylistDropdownOpen(open);
                        if (open) {
                          setPlaylistTooltipOpen(false);
                        }
                      }}
                      trigger={
                  <CircleActionButton
                    size="sm"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <Plus className="h-3 w-3 text-white" />
                  </CircleActionButton>
                      }
                    />
                  </div>
                ) : (
                  <CircleActionButton
                    size="sm"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void requireAuth(async () => undefined, "Sign in to manage playlists.");
                    }}
                  >
                    <Plus className="h-3 w-3 text-white" />
                  </CircleActionButton>
                )}
              </TooltipTrigger>
              <TooltipContent>
                <p>Add to Playlist</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-foreground line-clamp-1">
            {title}
          </h3>

          {/* Synopsis (Truncated to 2 lines) */}
          {item.overview && (
            <p className="text-xs text-foreground line-clamp-2 leading-snug">
              {item.overview}
            </p>
          )}
        </div>
      </div>

      {/* Detail Modal */}
    </>
  );
}

