"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { Play, Plus, Heart, Maximize2, Bookmark, Volume2, VolumeX, BookCheck, MoreVertical, Trash2, Eye } from "lucide-react";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries, getPosterUrl, TMDBVideo, getYouTubeEmbedUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CircleActionButton } from "./circle-action-button";
import TrailerModal from "./trailer-modal";
import { useToggleFavorite } from "@/hooks/use-favorites";
import { useToggleWatchlist } from "@/hooks/use-watchlist";
import AddToListDropdown from "@/components/content-detail/add-to-list-dropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useContentVideos } from "@/hooks/use-content-details";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import MoreLikeThisCard from "./more-like-this-card";
import { useQuery } from "@tanstack/react-query";
import { useIsWatched, useQuickWatch, useUnwatch } from "@/hooks/use-viewing-logs";

interface MovieCardProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  className?: string;
  canScrollPrev?: boolean;
  canScrollNext?: boolean;
  variant?: "default" | "more-like-this" | "dashboard"; // Variant for different card styles
  onCardClick?: (item: TMDBMovie | TMDBSeries, type: "movie" | "tv") => void; // Callback when card is clicked
  onAddToPlaylist?: () => void; // Callback when item is added to playlist
  onRemove?: () => void; // Callback to remove item from playlist
  forceDesktopVariantOnMobile?: boolean;
}

export default function MovieCard({ item, type, className, canScrollPrev = false, canScrollNext = false, variant = "default", onCardClick, onAddToPlaylist, onRemove, forceDesktopVariantOnMobile = false }: MovieCardProps) {
  const router = useRouter();
  const isMobileDevice = useIsMobile();
  const shouldForceDesktopVariant = forceDesktopVariantOnMobile && isMobileDevice;
  const isMobile = !shouldForceDesktopVariant && isMobileDevice;
  const [isHovered, setIsHovered] = useState(false);
  const [trailer, setTrailer] = useState<TMDBVideo | null>(null);
  const [allVideos, setAllVideos] = useState<TMDBVideo[]>([]);
  const toggleFavorite = useToggleFavorite();
  const toggleWatchlist = useToggleWatchlist();
  const quickWatch = useQuickWatch();
  const unwatch = useUnwatch();
  const { data: watchedData } = useIsWatched(item.id, type);
  const isWatched = watchedData?.isWatched || false;
  const watchedLogId = watchedData?.logId || null;
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptedFetchRef = useRef<number | null>(null); // Track which item ID we've attempted to fetch
  const [trailerError, setTrailerError] = useState<string | null>(null);
  const [playlistTooltipOpen, setPlaylistTooltipOpen] = useState(false);
  const [isPlaylistDropdownOpen, setIsPlaylistDropdownOpen] = useState(false);
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  
  // Only enable video fetching when hovering (on desktop) and not in dashboard variant
  // This prevents unnecessary API calls when cards are just rendered but not interacted with
  // Dashboard variant never needs videos, so we disable fetching for it completely
  const shouldFetchVideos = isHovered && !isMobile && variant !== "dashboard";
  
  // Use React Query to get cached videos (same cache as detail modal uses)
  // Disabled by default to prevent unnecessary fetches - only enabled when hovering on desktop (non-dashboard variant)
  const { data: cachedVideosData, isLoading: isLoadingCachedVideos } = useContentVideos(type, item.id, shouldFetchVideos);
  
  // On mobile/tablet, always show overlay with details (no hover/scaling needed)
  // On large screens, only show overlay on hover
  const shouldShowOverlay = isMobile ? true : isHovered;

  const title = "title" in item ? item.title : item.name;
  const posterPath = item.poster_path || item.backdrop_path;
  const releaseDate = type === "movie" ? (item as TMDBMovie).release_date : (item as TMDBSeries).first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  const hideOverlayForAudio = !isVideoMuted && !isMobile && variant !== "dashboard";

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

  // Reset fetch state when item changes
  useEffect(() => {
    attemptedFetchRef.current = null;
    setTrailer(null);
    setAllVideos([]);
    setTrailerError(null);
    setIsLoadingTrailer(false);
    setIsHovered(false);
    setIsVideoMuted(true);
  }, [item.id]);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!isMobile) {
      e.stopPropagation();
      setIsHovered(true);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (!isMobile) {
      e.stopPropagation();
      setIsHovered(false);
      setTrailer(null); // Clear trailer when not hovering
    }
  };

  // Extract videos from cached data or local state
  const videosFromCache = useMemo(() => {
    if (cachedVideosData?.results && cachedVideosData.results.length > 0) {
      return cachedVideosData.results;
    }
    return allVideos;
  }, [cachedVideosData, allVideos]);

  // Extract trailer from cached or local videos
  const trailerFromCache = useMemo(() => {
    if (videosFromCache.length === 0) return null;
    const officialTrailer = videosFromCache.find(
      (v: TMDBVideo) => v.type === "Trailer" && v.official && v.site === "YouTube"
    );
    const anyTrailer = videosFromCache.find(
      (v: TMDBVideo) => v.type === "Trailer" && v.site === "YouTube"
    );
    return officialTrailer || anyTrailer || null;
  }, [videosFromCache]);

  // Use cached videos if available, otherwise use local state
  const finalTrailer = trailerFromCache || trailer;
  const finalAllVideos = videosFromCache.length > 0 ? videosFromCache : allVideos;
  const finalIsLoading = isLoadingCachedVideos || isLoadingTrailer;
  const finalHasNoVideos = !finalIsLoading && finalAllVideos.length === 0;
  const finalError = trailerError && finalAllVideos.length === 0 ? trailerError : null;

  const handleOpenDetails = useCallback(() => {
    // If onCardClick is provided, use it to open modal/sheet
    // Otherwise, navigate to the details page
    if (onCardClick) {
      onCardClick(item, type);
    } else {
      router.push(`/${type}/${item.id}`);
    }
  }, [item, router, type, onCardClick]);

  const fetchTrailerVideos = useCallback(async () => {
    // If we have cached videos, use them instead of fetching
    if (cachedVideosData?.results && cachedVideosData.results.length > 0) {
      return;
    }

    if (attemptedFetchRef.current === item.id) return;

    attemptedFetchRef.current = item.id;
    setIsLoadingTrailer(true);
    setTrailerError(null);

    try {
      const response = await fetch(`/api/${type}/${item.id}/videos`);
      if (!response.ok) {
        throw new Error("Failed to fetch trailers");
      }

      const data = await response.json();
      const videos = data.results || [];
      setAllVideos(videos);

      const officialTrailer = videos.find(
        (v: TMDBVideo) => v.type === "Trailer" && v.official && v.site === "YouTube"
      );
      const anyTrailer = videos.find(
        (v: TMDBVideo) => v.type === "Trailer" && v.site === "YouTube"
      );
      const foundTrailer = officialTrailer || anyTrailer || null;
      setTrailer(foundTrailer);

      const noVideosAvailable = videos.length === 0;
      setTrailerError(
        noVideosAvailable ? "No trailers are available for this title yet." : null
      );
    } catch (error) {
      console.error("Error fetching trailer:", error);
      attemptedFetchRef.current = null;
      setTrailer(null);
      setAllVideos([]);
      // Only set error if we don't have cached videos
      if (!cachedVideosData?.results || cachedVideosData.results.length === 0) {
        setTrailerError("Unable to load trailers right now. Please try again later.");
      }
    } finally {
      setIsLoadingTrailer(false);
    }
  }, [item.id, type, cachedVideosData]);

  // Fetch trailer on desktop hover only (not on mobile to save data)
  useEffect(() => {
    // Only fetch on desktop hover, not on mobile
    if (isHovered && !isMobile && variant !== "dashboard" && attemptedFetchRef.current !== item.id) {
      hoverTimeoutRef.current = setTimeout(() => {
        fetchTrailerVideos();
      }, 500); // 500ms delay on desktop hover
    }

    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [isHovered, fetchTrailerVideos, isMobile, item.id, variant]);

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

  if (isMobile) {
    return (
      <MoreLikeThisCard
        item={item}
        type={type}
        onItemClick={onCardClick}
        className={cn("flex-shrink-0", className)}
        onAddToPlaylist={onAddToPlaylist}
      />
    );
  }


  return (
    <>
      <div
        ref={cardRef}
        className={cn(
          "relative group flex-shrink-0 cursor-pointer",
          isHovered && !isMobile && "z-40",
          className
        )}
        data-can-scroll-prev={canScrollPrev ? "" : undefined}
        data-can-scroll-next={canScrollNext ? "" : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          // Don't navigate if clicking on buttons, tooltips, dropdowns, or if trailer modal is open
          if (
            !target.closest("button") && 
            !target.closest('[role="button"]') && 
            !target.closest('[data-radix-dropdown-trigger]') &&
            !target.closest('[data-radix-dropdown-content]') &&
            !target.closest('[data-radix-tooltip-trigger]') &&
            !target.closest('[data-radix-tooltip-content]') &&
            !isTrailerModalOpen
          ) {
            // Navigate to details page when clicking on the card
            router.push(`/${type}/${item.id}`);
          }
        }}
      >
        <div
          className={cn(
            "relative block aspect-[2/3] rounded-lg overflow-hidden group border border-border/50 shadow-sm",
            isHovered && !isMobile && "z-40"
          )}
        >
          {/* Poster Image - Always visible as fallback */}
          {posterPath ? (
            <Image
              src={getPosterUrl(posterPath, "w500")}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              style={{
                willChange: "transform",
                backfaceVisibility: "hidden",
              }}
              sizes="(max-width: 640px) 200px, 300px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No Image</span>
            </div>
          )}

          {/* Overlay Content */}
          <div
            className={cn(
              "absolute inset-0 rounded-lg transition-all duration-500 ease-out",
              shouldShowOverlay ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-1 pointer-events-none"
            )}
            style={{
              willChange: shouldShowOverlay ? "opacity, transform" : "opacity",
            }}
          >
            {/* Trailer preview layer */}
            {shouldShowOverlay && !isMobile && variant !== "dashboard" && finalTrailer && !finalIsLoading && finalTrailer.key && (
              <div className="absolute inset-0 z-10 overflow-hidden">
                <iframe
                  key={`${finalTrailer.key}-${isVideoMuted}`}
                  src={getYouTubeEmbedUrl(finalTrailer.key, true, isVideoMuted)}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ pointerEvents: "none" }}
                  title="Trailer"
                />
              </div>
            )}

            {!hideOverlayForAudio && (
              <>
                {/* Overlay gradient */}
                <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/95 via-black/75 to-transparent pointer-events-none" />

                <div
                  className={cn(
                    "relative z-30 h-full w-full flex flex-col text-white",
                    isMobile || variant === "dashboard" ? "p-3" : "p-4"
                  )}
                  style={{
                    transform: "translateZ(0)", // Force GPU acceleration
                    backfaceVisibility: "hidden", // Prevent blur on transforms
                  }}
                >
                  <div className="flex items-center justify-between" style={{ transform: "translateZ(0)", willChange: "transform" }}>
                    <div className="flex items-center gap-2">
                      <DropdownMenu open={isActionsDropdownOpen} onOpenChange={setIsActionsDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                          <CircleActionButton
                            size="sm"
                            className="bg-black/60 hover:bg-black/80 backdrop-blur-sm z-[5]"
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
                          {onRemove && (
                            <>
                              <div className="my-1 border-t border-border" />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onRemove();
                                  setIsActionsDropdownOpen(false);
                                }}
                                className="cursor-pointer text-destructive focus:text-destructive text-[0.8rem]"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove from Playlist
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {shouldShowOverlay && !isMobile && variant !== "dashboard" && finalTrailer && !finalIsLoading && finalTrailer.key && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full p-0 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/30 cursor-pointer h-7 w-7"
                            style={{ transform: "translateZ(0)", willChange: "transform" }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsVideoMuted(!isVideoMuted);
                            }}
                          >
                            {isVideoMuted ? (
                              <VolumeX className="text-white h-3 w-3" />
                            ) : (
                              <Volume2 className="text-white h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isVideoMuted ? "Unmute" : "Mute"}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  <div className="mt-auto space-y-2">
                    {/* Action Buttons Row */}
                    <div
                      className={cn(
                        "flex items-center justify-between mb-2",
                        isMobile ? "gap-1" : "gap-1.5"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          className={cn(
                            "rounded-full bg-black/60 hover:bg-black/70 text-white font-medium cursor-pointer backdrop-blur-md border border-white/30",
                            isMobile ? "h-6 px-2 text-[10px]" : "h-7 px-3 text-xs"
                          )}
                          style={{ transform: "translateZ(0)", willChange: "transform" }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsTrailerModalOpen(true);

                            if (!cachedVideosData?.results && attemptedFetchRef.current !== item.id && !isLoadingTrailer) {
                              fetchTrailerVideos();
                            }
                          }}
                        >
                          <Play className={cn("fill-white text-white", isMobile ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1")} />
                          {!isMobile && "Trailer"}
                        </Button>
                      <Tooltip
                        open={playlistTooltipOpen && !isPlaylistDropdownOpen}
                        onOpenChange={(open) => setPlaylistTooltipOpen(open)}
                      >
                          <TooltipTrigger asChild>
                          {isSignedIn ? (
                            <div>
                              <AddToListDropdown
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
                                    className="backdrop-blur-md z-[5]"
                                    onClick={(e: React.MouseEvent) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                  >
                                    <Plus className={cn("text-white", isMobile ? "h-2.5 w-2.5" : "h-3 w-3")} />
                                  </CircleActionButton>
                                }
                              />
                            </div>
                          ) : (
                            <CircleActionButton
                              size="sm"
                              className="backdrop-blur-md z-[5]"
                              onClick={(e: React.MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void requireAuth(async () => undefined, "Sign in to manage playlists.");
                              }}
                            >
                              <Plus className={cn("text-white", isMobile ? "h-2.5 w-2.5" : "h-3 w-3")} />
                            </CircleActionButton>
                          )}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Add to Playlist</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {variant === "more-like-this" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full p-0 bg-white hover:bg-white/90 text-black shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center h-7 w-7"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenDetails();
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full p-0 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/30 cursor-pointer h-7 w-7"
                          style={{ transform: "translateZ(0)", willChange: "transform" }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenDetails();
                          }}
                        >
                          <Maximize2 className="text-white h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <div
                      className={cn(
                        "flex items-center",
                        isMobile ? "gap-1" : "gap-2"
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <IMDBBadge size={isMobile ? 16 : 20} />
                        <span className={cn("font-semibold text-white", isMobile ? "text-[10px]" : "text-xs")}>
                          {ratingData?.rating ? ratingData.rating.toFixed(1) : "N/A"}
                        </span>
                      </div>
                      {year && (
                        <>
                          <span className={cn("text-white/80", isMobile ? "text-[10px]" : "text-xs")}>•</span>
                          <span className={cn("text-white/80", isMobile ? "text-[10px]" : "text-xs")}>{year}</span>
                        </>
                      )}
                      <span className={cn("text-white/80", isMobile ? "text-[10px]" : "text-xs")}>•</span>
                      <span className={cn("text-white/80 uppercase", isMobile ? "text-[10px]" : "text-xs")}>
                        {type === "movie" ? "Movie" : "TV"}
                      </span>
                    </div>

                    <h3
                      className={cn(
                        "font-bold text-white line-clamp-1",
                        isMobile ? "text-xs" : "text-sm"
                      )}
                    >
                      {title}
                    </h3>

                  </div>
                </div>
              </>
            )}

            {shouldShowOverlay && !isMobile && variant !== "dashboard" && finalTrailer && !finalIsLoading && finalTrailer.key && !isVideoMuted && (
              <div className="absolute inset-0 flex items-end justify-end z-20 pointer-events-none p-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/10 text-white border-white/40 hover:bg-white/20 h-8 w-8 rounded-full backdrop-blur-md cursor-pointer pointer-events-auto"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsVideoMuted(true);
                      }}
                    >
                      <BookCheck className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      {isTrailerModalOpen && (
        <TrailerModal
          video={finalTrailer}
          videos={finalAllVideos}
          isOpen={isTrailerModalOpen}
          onClose={() => setIsTrailerModalOpen(false)}
          title={title}
          isLoading={finalIsLoading}
          hasNoVideos={finalHasNoVideos}
          errorMessage={finalError}
          onOpenDetails={handleOpenDetails}
        />
      )}
    </>
  );
}