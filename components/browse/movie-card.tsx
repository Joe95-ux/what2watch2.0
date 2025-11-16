"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { Star, Play, Plus, Heart, Maximize2, Bookmark, Volume2, VolumeX } from "lucide-react";
import { TMDBMovie, TMDBSeries, getPosterUrl, TMDBVideo, getYouTubeEmbedUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CircleActionButton } from "./circle-action-button";
import ContentDetailModal from "./content-detail-modal";
import TrailerModal from "./trailer-modal";
import { useToggleFavorite } from "@/hooks/use-favorites";
import { useToggleWatchlist } from "@/hooks/use-watchlist";
import AddToPlaylistDropdown from "@/components/playlists/add-to-playlist-dropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { useContentVideos } from "@/hooks/use-content-details";

interface MovieCardProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  className?: string;
  canScrollPrev?: boolean;
  canScrollNext?: boolean;
  variant?: "default" | "more-like-this" | "dashboard"; // Variant for different card styles
  onCardClick?: () => void; // Callback when card is clicked
  onAddToPlaylist?: () => void; // Callback when item is added to playlist
}

export default function MovieCard({ item, type, className, canScrollPrev = false, canScrollNext = false, variant = "default", onCardClick, onAddToPlaylist }: MovieCardProps) {
  const isMobile = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);
  const [trailer, setTrailer] = useState<TMDBVideo | null>(null);
  const [allVideos, setAllVideos] = useState<TMDBVideo[]>([]);
  const toggleFavorite = useToggleFavorite();
  const toggleWatchlist = useToggleWatchlist();
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptedFetchRef = useRef<number | null>(null); // Track which item ID we've attempted to fetch
  const [trailerError, setTrailerError] = useState<string | null>(null);
  
  // Use React Query to get cached videos (same cache as detail modal uses)
  const { data: cachedVideosData, isLoading: isLoadingCachedVideos } = useContentVideos(type, item.id);
  
  // On mobile/tablet, always show overlay with details (no hover/scaling needed)
  // Dashboard variant also always shows overlay
  const shouldShowOverlay = isHovered || isMobile || variant === "dashboard";

  const title = "title" in item ? item.title : item.name;
  const posterPath = item.poster_path || item.backdrop_path;
  const releaseDate = type === "movie" ? (item as TMDBMovie).release_date : (item as TMDBSeries).first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;

  // Reset hover state when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setIsHovered(false);
      setTrailer(null);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    }
  }, [isModalOpen]);

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
    if (isHovered && !isMobile && variant !== "dashboard" && !isModalOpen && attemptedFetchRef.current !== item.id) {
      hoverTimeoutRef.current = setTimeout(() => {
        fetchTrailerVideos();
      }, 500); // 500ms delay on desktop hover
    }

    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [isHovered, isModalOpen, fetchTrailerVideos, isMobile, item.id, variant]);


  return (
    <>
      <div
        ref={cardRef}
        className={cn(
          "relative group flex-shrink-0 cursor-pointer",
          isHovered && !isMobile && "z-40",
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          // Don't open details modal if clicking on buttons or if trailer modal is open
          if (!target.closest("button") && !target.closest('[role="button"]') && !isTrailerModalOpen) {
            setIsModalOpen(true);
            onCardClick?.(); // Call callback when card is clicked
          }
        }}
      >
        <div
          className={cn(
            "relative block aspect-[2/3] rounded-lg overflow-hidden",
            isHovered && !isMobile && "z-40",
            !isMobile && variant !== "dashboard" && "transition-transform duration-500 ease-out"
          )}
          style={{
            transform: !isMobile && variant !== "dashboard" && shouldShowOverlay ? "scale(1.05)" : "scale(1)",
            willChange: !isMobile && variant !== "dashboard" ? "transform" : "auto",
          }}
        >
          {/* Poster Image - Always visible as fallback */}
          {posterPath ? (
            <Image
              src={getPosterUrl(posterPath, "w500")}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 200px, 300px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No Image</span>
            </div>
          )}

          {/* Hover Overlay with Info - Always visible on mobile, hover on desktop */}
          <div
            className={cn(
              "absolute inset-0 rounded-lg",
              isMobile || variant === "dashboard" 
                ? "bg-gradient-to-t from-black/95 via-black/70 to-transparent"
                : "bg-gradient-to-t from-black/95 via-black/70 to-transparent",
              shouldShowOverlay ? "opacity-100" : "opacity-0 pointer-events-none",
              "transition-opacity duration-300"
            )}
            onClick={(e) => {
              // Prevent card click when clicking on overlay
              e.stopPropagation();
            }}
          >
            {/* Top Section: Video Playback Area with Badges */}
            <div 
              className="absolute top-0 left-0 right-0 h-[60%] flex items-center justify-center overflow-hidden rounded-t-lg"
              style={{
                backgroundImage: posterPath ? `url(${getPosterUrl(posterPath, "w500")})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/* Trailer Preview (desktop hover only - no autoplay on mobile or dashboard) */}
              {shouldShowOverlay && !isMobile && variant !== "dashboard" && finalTrailer && !finalIsLoading && finalTrailer.key && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <iframe
                    key={`${finalTrailer.key}-${isVideoMuted}`}
                    src={getYouTubeEmbedUrl(finalTrailer.key, true, isVideoMuted)}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ pointerEvents: "none" }}
                    title="Trailer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
                </div>
              )}

              {/* Watchlist Badge - Left */}
              {!isMobile && variant !== "dashboard" && (
                <div className="absolute left-3 top-3 z-20 pointer-events-auto">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CircleActionButton
                        size="sm"
                        onClick={async (e: React.MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await toggleWatchlist.toggle(item, type);
                        }}
                      >
                        <Bookmark 
                          className={cn(
                            "h-3 w-3",
                            toggleWatchlist.isInWatchlist(item.id, type)
                              ? "text-blue-500 fill-blue-500"
                              : "text-white"
                          )} 
                        />
                      </CircleActionButton>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{toggleWatchlist.isInWatchlist(item.id, type) ? "Remove from Watchlist" : "Add to Watchlist"}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              {/* Expand Badge - Right */}
              {variant === "more-like-this" ? (
                <div className="absolute right-3 top-3 z-20 pointer-events-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "rounded-full p-0 bg-white hover:bg-white/90 text-black shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center",
                      isMobile ? "h-7 w-7" : "h-9 w-9"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsModalOpen(true);
                    }}
                  >
                    <Plus className={cn(isMobile ? "h-3.5 w-3.5" : "h-5 w-5")} />
                  </Button>
                </div>
              ) : (
                <div className={cn(
                  "absolute z-20 pointer-events-auto",
                  isMobile ? "top-1.5 right-1.5" : "top-3 right-3"
                )}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "rounded-full p-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/30 cursor-pointer",
                      isMobile ? "h-6 w-6" : "h-8 w-8"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsModalOpen(true);
                    }}
                  >
                    <Maximize2 className={cn("text-white", isMobile ? "h-3 w-3" : "h-4 w-4")} />
                  </Button>
                </div>
              )}

              {/* Audio Control Button - Bottom right of first section (desktop only when video is playing) */}
              {shouldShowOverlay && !isMobile && variant !== "dashboard" && finalTrailer && !finalIsLoading && finalTrailer.key && (
                <div className="absolute right-3 bottom-3 z-20 pointer-events-auto">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full p-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/30 cursor-pointer h-8 w-8"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsVideoMuted(!isVideoMuted);
                        }}
                      >
                        {isVideoMuted ? (
                          <VolumeX className="text-white h-4 w-4" />
                        ) : (
                          <Volume2 className="text-white h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isVideoMuted ? "Unmute" : "Mute"}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              {/* Play Button - Center (only show on desktop when video is not playing) */}
              {!isMobile && variant !== "dashboard" && (!shouldShowOverlay || !finalTrailer || finalIsLoading || !finalTrailer.key) && (
                <Button
                  size="sm"
                  className="rounded-full bg-black/60 hover:bg-black/80 text-white font-medium cursor-pointer backdrop-blur-sm border border-white/20 z-10 h-10 px-4 text-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsModalOpen(false);
                    setIsTrailerModalOpen(true);

                    if (!cachedVideosData?.results && attemptedFetchRef.current !== item.id && !isLoadingTrailer) {
                      fetchTrailerVideos();
                    }
                  }}
                >
                  <Play className="fill-white text-white h-4 w-4 mr-1.5" />
                  Play
                </Button>
              )}
            </div>

            {/* Bottom Section: Content Info */}
            <div className={cn(
              "absolute bottom-0 left-0 right-0 space-y-2 rounded-b-lg",
              isMobile ? "p-2.5" : "p-4",
              !isMobile && variant !== "dashboard" && "bg-black/95"
            )}>
              {/* Action Buttons Row */}
              <div className={cn(
                "flex items-center mb-2",
                isMobile ? "gap-1" : "gap-1.5"
              )}>
                {/* Play Trailer Button */}
                <Button
                  size="sm"
                  className={cn(
                    "rounded-full bg-black/60 hover:bg-black/80 text-white font-medium cursor-pointer backdrop-blur-sm border border-white/20",
                    isMobile ? "h-6 px-2 text-[10px]" : "h-7 px-3 text-xs"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsModalOpen(false);
                    setIsTrailerModalOpen(true);

                    if (!cachedVideosData?.results && attemptedFetchRef.current !== item.id && !isLoadingTrailer) {
                      fetchTrailerVideos();
                    }
                  }}
                >
                  <Play className={cn("fill-white text-white", isMobile ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1")} />
                  {!isMobile && "Trailer"}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <AddToPlaylistDropdown
                        item={item}
                        type={type}
                        onAddSuccess={onAddToPlaylist}
                        trigger={
                          <CircleActionButton
                            size={isMobile ? "sm" : "sm"}
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
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add to Playlist</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CircleActionButton
                      size={isMobile ? "sm" : "sm"}
                      onClick={async (e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await toggleFavorite.toggle(item, type);
                      }}
                    >
                      <Heart 
                        className={cn(
                          isMobile ? "h-2.5 w-2.5" : "h-3 w-3",
                          toggleFavorite.isFavorite(item.id, type)
                            ? "text-red-500 fill-red-500"
                            : "text-white"
                        )} 
                      />
                    </CircleActionButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{toggleFavorite.isFavorite(item.id, type) ? "Remove from My List" : "Add to My List"}</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Rating and Type */}
              <div className={cn(
                "flex items-center",
                isMobile ? "gap-1" : "gap-2"
              )}>
                <div className="flex items-center gap-0.5">
                  <Star className={cn("text-yellow-400 fill-yellow-400", isMobile ? "h-2.5 w-2.5" : "h-3 w-3")} />
                  <span className={cn("font-semibold text-white", isMobile ? "text-[10px]" : "text-xs")}>
                    {item.vote_average.toFixed(1)}
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

              {/* Title */}
              <h3 className={cn(
                "font-bold text-white line-clamp-1",
                isMobile ? "text-xs" : "text-sm"
              )}>{title}</h3>

              {/* Overview */}
              {item.overview && (
                <p className={cn(
                  "text-white/90 line-clamp-2 leading-relaxed",
                  isMobile ? "text-[10px]" : "text-xs"
                )}>
                  {item.overview}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <ContentDetailModal
        item={item}
        type={type}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

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
          onOpenDetails={() => {
            setIsModalOpen(true);
          }}
        />
      )}
    </>
  );
}