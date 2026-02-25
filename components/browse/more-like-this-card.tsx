"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Play, Plus, Heart, Bookmark, MoreVertical, Eye, ThumbsUp } from "lucide-react";
import { FaCaretUp, FaCaretDown } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries, getPosterUrl } from "@/lib/tmdb";
import { createContentUrl } from "@/lib/content-slug";
import { CircleActionButton } from "./circle-action-button";
import { useToggleFavorite } from "@/hooks/use-favorites";
import { useToggleWatchlist } from "@/hooks/use-watchlist";
import AddToListDropdown from "@/components/content-detail/add-to-list-dropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsWatched, useQuickWatch, useUnwatch } from "@/hooks/use-viewing-logs";
import { useContentReactions, useLikeContent } from "@/hooks/use-content-reactions";
import { Skeleton } from "@/components/ui/skeleton";
import { useSeenSeasons } from "@/hooks/use-episode-tracking";
import { useTVSeasons } from "@/hooks/use-content-details";

interface MoreLikeThisCardProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  parentItem?: TMDBMovie | TMDBSeries;
  parentType?: "movie" | "tv";
  onItemClick?: (item: TMDBMovie | TMDBSeries, itemType: "movie" | "tv") => void;
  showTypeBadge?: boolean; // Show TV/Movies badge when filter is "all"
  className?: string;
  onAddToPlaylist?: () => void;
  /** When set (e.g. from /search?watchProvider=x), show JustWatch 24h rank instead of runtime in top-right. */
  justwatchRank?: number | null;
  /** Delta for rank badge (positive = up, negative = down). Used with justwatchRank. */
  justwatchRankDelta?: number | null;
  /** When true, show a skeleton in the rank/runtime slot until ranks are loaded (then rank or runtime). */
  justwatchRankLoading?: boolean;
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
  justwatchRank = null,
  justwatchRankDelta = null,
  justwatchRankLoading = false,
}: MoreLikeThisCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [runtime, setRuntime] = useState<number | null>(null);
  const [isLoadingRuntime, setIsLoadingRuntime] = useState(false);
  const attemptedRuntimeFetchRef = useRef<number | null>(null); // Track which item ID we've attempted to fetch
  const toggleFavorite = useToggleFavorite();
  const toggleWatchlist = useToggleWatchlist();
  const quickWatch = useQuickWatch();
  const unwatch = useUnwatch();
  const { data: watchedData } = useIsWatched(item.id, type);
  const isWatched = watchedData?.isWatched || false;
  const watchedLogId = watchedData?.logId || null;
  const isMobile = useIsMobile();
  const { isSignedIn } = useUser();
  
  // For TV shows: calculate progress percentage
  const { data: seenSeasons = [] } = useSeenSeasons(type === "tv" ? item.id : null);
  const { data: tvSeasonsData } = useTVSeasons(type === "tv" ? item.id : null);
  
  // Calculate progress percentage for TV shows
  const watchProgress = (() => {
    if (type !== "tv" || !tvSeasonsData?.seasons) return null;
    
    const regularSeasons = tvSeasonsData.seasons.filter(s => s.season_number > 0);
    if (regularSeasons.length === 0) return null;
    
    const seenCount = seenSeasons.length;
    const totalCount = regularSeasons.length;
    
    if (seenCount === 0) return null; // Not started
    
    return Math.round((seenCount / totalCount) * 100);
  })();
  const { openSignIn } = useClerk();
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  
  // Content reactions (likes)
  const { data: reactionData } = useContentReactions(item.id, type);
  const likeContent = useLikeContent();
  const isLiked = reactionData?.isLiked || false;
  const likeCount = reactionData?.likeCount || 0;

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
  
  // Fetch IMDb rating
  const { data: ratingData } = useQuery({
    queryKey: ["imdb-rating-by-tmdb", item.id, type],
    queryFn: async () => {
      const response = await fetch(`/api/imdb-rating-by-tmdb?tmdbId=${item.id}&type=${type}`);
      if (!response.ok) return null;
      return response.json() as Promise<{ rating: number | null; source: "imdb" | "tmdb" | null } | null>;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    retry: 1,
  });

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
      // Use callback if provided, otherwise navigate directly
      if (onItemClick) {
        onItemClick(item, type);
      } else {
        const title = "title" in item ? item.title : item.name;
        router.push(createContentUrl(type, item.id, title));
      }
    }
  };

  const promptSignIn = useCallback(
    (message?: string) => {
      toast.info(message ?? "Please sign in to perform this action.");
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
        {/* Section 1: Movie Poster - Square aspect ratio */}
        <div className="relative aspect-[3/4] bg-muted overflow-hidden border-b border-border/50">
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

          {/* Actions Menu - Top Left */}
          <div className="absolute top-2 left-2 z-[5]">
            <DropdownMenu open={isActionsDropdownOpen} onOpenChange={setIsActionsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <CircleActionButton
                  size="sm"
                  className="bg-black/60 hover:bg-black/80 backdrop-blur-sm"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <MoreVertical className="h-3 w-3 text-white" />
                </CircleActionButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-48 z-[110]"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
              >
                <DropdownMenuItem
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isSignedIn) {
                      promptSignIn("Sign in to mark films as watched.");
                      setIsActionsDropdownOpen(false);
                      return;
                    }
                    try {
                      if (isWatched && watchedLogId) {
                        await unwatch.mutateAsync(watchedLogId);
                        toast.success("Removed from watched");
                      } else {
                        const title = "title" in item ? item.title : item.name;
                        await quickWatch.mutateAsync({
                          tmdbId: item.id,
                          mediaType: type,
                          title,
                          posterPath: item.poster_path || null,
                          backdropPath: item.backdrop_path || null,
                          releaseDate: "release_date" in item ? item.release_date || null : null,
                          firstAirDate: "first_air_date" in item ? item.first_air_date || null : null,
                        });
                        toast.success("Marked as watched");
                      }
                    } catch {
                      toast.error("Failed to update watched status");
                    }
                    setIsActionsDropdownOpen(false);
                  }}
                  className="cursor-pointer text-[0.8rem]"
                >
                  <Eye
                    className={cn(
                      "h-4 w-4 mr-2",
                      isWatched
                        ? "text-green-500"
                        : "text-muted-foreground"
                    )}
                  />
                  {isWatched ? "Watched" : "Mark as Watched"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await requireAuth(
                      () => toggleFavorite.toggle(item, type),
                      "Sign in to like titles."
                    );
                    setIsActionsDropdownOpen(false);
                  }}
                  className="cursor-pointer text-[0.8rem]"
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 mr-2",
                      toggleFavorite.isFavorite(item.id, type)
                        ? "text-red-500 fill-red-500"
                        : "text-muted-foreground"
                    )}
                  />
                  {toggleFavorite.isFavorite(item.id, type) ? "Remove from My List" : "Add to My List"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isSignedIn) {
                      promptSignIn("Sign in to like content.");
                      setIsActionsDropdownOpen(false);
                      return;
                    }
                    try {
                      await likeContent.mutateAsync({
                        tmdbId: item.id,
                        mediaType: type,
                      });
                    } catch (error) {
                      toast.error("Failed to update like status");
                    }
                    setIsActionsDropdownOpen(false);
                  }}
                  className="cursor-pointer text-[0.8rem]"
                >
                  <ThumbsUp
                    className={cn(
                      "h-4 w-4 mr-2",
                      isLiked
                        ? "text-primary fill-primary"
                        : "text-muted-foreground"
                    )}
                  />
                  {isLiked ? "Unlike" : "Like"}
                  {likeCount > 0 && <span className="ml-2 text-sm">({likeCount})</span>}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await requireAuth(
                      () => toggleWatchlist.toggle(item, type),
                      "Sign in to manage your watchlist."
                    );
                    setIsActionsDropdownOpen(false);
                  }}
                  className="cursor-pointer text-[0.8rem]"
                >
                  <Bookmark
                    className={cn(
                      "h-4 w-4 mr-2",
                      toggleWatchlist.isInWatchlist(item.id, type)
                        ? "text-blue-500 fill-blue-500"
                        : "text-muted-foreground"
                    )}
                  />
                  {toggleWatchlist.isInWatchlist(item.id, type) ? "Remove from Watchlist" : "Add to Watchlist"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Rank (24h), Runtime, or Skeleton - Top Right */}
          {justwatchRankLoading ? (
            <div className="absolute top-2 right-2 z-[5]">
              <Skeleton className="h-6 w-16 rounded bg-white/20" />
            </div>
          ) : justwatchRank != null ? (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-[0.85rem] text-white font-medium z-[5]">
              <Image
                src="/jw-icon.png"
                alt=""
                width={13}
                height={13}
                className="object-contain shrink-0"
                unoptimized
              />
              <span className="tabular-nums">#{justwatchRank}</span>
              {justwatchRankDelta != null && justwatchRankDelta !== 0 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium",
                    justwatchRankDelta > 0 ? "bg-green-600 text-white" : "bg-red-600 text-white"
                  )}
                >
                  {justwatchRankDelta > 0 ? (
                    <FaCaretUp className="h-3 w-3 fill-current" />
                  ) : (
                    <FaCaretDown className="h-3 w-3 fill-current" />
                  )}
                  {Math.abs(justwatchRankDelta)}
                </span>
              )}
            </div>
          ) : runtimeText ? (
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-[0.85rem] text-white font-medium z-[5]">
              {runtimeText}
            </div>
          ) : null}

          {/* Type Badge - Bottom Left (when filter is "all") */}
          {showTypeBadge && (
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-sm text-white font-medium z-[5]">
              {type === "movie" ? "Movie" : "TV"}
            </div>
          )}

          {/* Progress Ring - Center (for TV shows with partial progress) */}
          {watchProgress != null && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[4]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="pointer-events-auto">
                    <div className="relative w-16 h-16">
                      {/* Background circle */}
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                        {/* Background circle */}
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke="rgba(0, 0, 0, 0.3)"
                          strokeWidth="4"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke="rgb(34, 197, 94)" // green-500
                          strokeWidth="4"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - watchProgress / 100)}`}
                          strokeLinecap="round"
                          className="transition-all duration-300"
                        />
                      </svg>
                      {/* Percentage text */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[0.75rem] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          {watchProgress}%
                        </span>
                      </div>
                      {/* Badge background overlay */}
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-full -z-10" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{watchProgress}% watched</p>
                </TooltipContent>
              </Tooltip>
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
                const title = "title" in item ? item.title : item.name;
                router.push(createContentUrl(type, item.id, title));
              }}
              className="pointer-events-auto z-[5]"
            >
              <Play className="size-6 text-white fill-white" />
            </CircleActionButton>
          </div>
        </div>

        {/* Section 2: Movie Details */}
        <div className="bg-muted dark:bg-card border-t border-border/50 p-3 space-y-2">
          {/* Top Row: Release Date + Rating + Add Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {year && <span>{year}</span>}
              {year && <span>•</span>}
              <div className="flex items-center gap-1">
                <IMDBBadge size={16} />
                <span className="font-medium text-foreground">
                  {ratingData?.rating ? ratingData.rating.toFixed(1) : "N/A"}
                </span>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                {isSignedIn ? (
                  <div>
                    <AddToListDropdown
                      item={item}
                      type={type}
                      onAddSuccess={onAddToPlaylist}
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
                <p>Add to List</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-foreground line-clamp-1">
            {title}
          </h3>
        </div>
      </div>

      {/* Detail Modal */}
    </>
  );
}

