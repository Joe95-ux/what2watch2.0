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
        data-can-scroll-prev={canScrollPrev ? "" : undefined}
        data-can-scroll-next={canScrollNext ? "" : undefined}
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
            "relative block aspect-[2/3] rounded-lg overflow-hidden group",
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
              "absolute inset-0 rounded-lg transition-all duration-300",
              !isMobile && variant !== "dashboard" && "transition-transform duration-500 ease-out group-hover:scale-105",
              shouldShowOverlay ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none",
              (isMobile || variant === "dashboard") && "opacity-100 translate-y-0 pointer-events-auto"
            )}
            onClick={(e) => e.stopPropagation()}
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

            {/* Overlay gradient */}
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/95 via-black/75 to-transparent pointer-events-none" />

            <div
              className={cn(
                "relative z-30 h-full w-full flex flex-col text-white",
                isMobile || variant === "dashboard" ? "p-3" : "p-4"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CircleActionButton
                        size="sm"
                        onClick={async (e: React.MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await toggleFavorite.toggle(item, type);
                        }}
                      >
                        <Heart
                          className={cn(
                            "h-3 w-3",
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

                {shouldShowOverlay && !isMobile && variant !== "dashboard" && finalTrailer && !finalIsLoading && finalTrailer.key && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full p-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/30 cursor-pointer h-7 w-7"
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
                        "rounded-full bg-black/60 hover:bg-black/70 text-white font-medium cursor-pointer backdrop-blur-sm border border-white/30",
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
                                size="sm"
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
                  </div>

                  {variant === "more-like-this" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full p-0 bg-white hover:bg-white/90 text-black shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center h-7 w-7"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsModalOpen(true);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full p-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/30 cursor-pointer h-7 w-7"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsModalOpen(true);
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
                  {item.vote_average !== undefined && item.vote_average > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Star className={cn("text-yellow-400 fill-yellow-400", isMobile ? "h-2.5 w-2.5" : "h-3 w-3")} />
                      <span className={cn("font-semibold text-white", isMobile ? "text-[10px]" : "text-xs")}>
                        {item.vote_average.toFixed(1)}
                      </span>
                    </div>
                  )}
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

                {item.overview && (
                  <p
                    className={cn(
                      "text-white/90 line-clamp-2 leading-relaxed",
                      isMobile ? "text-[10px]" : "text-xs"
                    )}
                  >
                    {item.overview}
                  </p>
                )}
              </div>
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