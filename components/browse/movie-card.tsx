"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { Star, Play, Plus, Heart, Maximize2 } from "lucide-react";
import { TMDBMovie, TMDBSeries, getPosterUrl, TMDBVideo, getYouTubeEmbedUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CircleActionButton } from "./circle-action-button";
import ContentDetailModal from "./content-detail-modal";
import TrailerModal from "./trailer-modal";
import { useToggleFavorite } from "@/hooks/use-favorites";
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
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalRectRef = useRef<DOMRect | null>(null);
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
  }, [item.id]);

  // Store original rect when hover starts - capture synchronously before transforms
  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!isMobile && cardRef.current) {
      e.stopPropagation();
      // Capture rect synchronously before setting hover state to prevent jumpiness
      originalRectRef.current = cardRef.current.getBoundingClientRect();
      setIsHovered(true);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (!isMobile) {
      e.stopPropagation();
      setIsHovered(false);
      setTrailer(null); // Clear trailer when not hovering
      originalRectRef.current = null;
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

  // Calculate position to prevent card from going off-screen (desktop only)
  const getCardStyle = () => {
    // No scaling on mobile/tablet
    if (isMobile || variant === "dashboard" || !isHovered || !cardRef.current) return {};
    
    // Use original rect (before scaling) to prevent feedback loop
    // If we don't have originalRect yet, don't apply transform to avoid jumpiness
    const rect = originalRectRef.current;
    if (!rect) {
      // Wait for originalRect to be captured before applying transform
      return {};
    }
    const viewportWidth = window.innerWidth;
    
    // Check if card is under gradient area (first 64px from viewport edges)
    // Only prevent scaling if gradients are actually visible (when can scroll)
    const isUnderLeftGradient = canScrollPrev && rect.left < 64;
    const isUnderRightGradient = canScrollNext && rect.right > viewportWidth - 64;
    
    // Don't scale if under gradient area AND gradients are visible
    if (isUnderLeftGradient || isUnderRightGradient) {
      return {};
    }
    
    // Different scale for "more-like-this" variant (smaller scale like Netflix)
    // Dashboard variant already returned early, so we only handle default and more-like-this here
    const scale = variant === "more-like-this" ? 1.15 : 1.4;
    
    // Calculate scaled dimensions
    const scaledWidth = rect.width * scale;
    const scaledHeight = rect.height * scale;
    const scaleOffsetX = (scaledWidth - rect.width) / 2;
    const scaleOffsetY = (scaledHeight - rect.height) / 2;
    
    // Calculate where scaled card would be positioned
    const scaledLeft = rect.left - scaleOffsetX;
    const scaledRight = rect.right + scaleOffsetX;
    const scaledTop = rect.top - scaleOffsetY;
    const scaledBottom = rect.bottom + scaleOffsetY;
    
    // Check if scaled card would overflow viewport
    const wouldOverflowRight = scaledRight > viewportWidth - 20;
    const wouldOverflowLeft = scaledLeft < 20;
    const wouldOverflowTop = scaledTop < 20;
    const wouldOverflowBottom = scaledBottom > window.innerHeight - 20;
    
    let transform = `scale(${scale})`;
    let translateX = 0;
    let translateY = 0;
    
    // Adjust horizontal position if needed
    if (wouldOverflowRight && !wouldOverflowLeft) {
      translateX = -(scaledRight - viewportWidth + 20);
    } else if (wouldOverflowLeft && !wouldOverflowRight) {
      translateX = 20 - scaledLeft;
    }
    
    // Adjust vertical position if needed
    if (wouldOverflowTop && !wouldOverflowBottom) {
      translateY = 20 - scaledTop;
    } else if (wouldOverflowBottom && !wouldOverflowTop) {
      translateY = -(scaledBottom - window.innerHeight + 20);
    }
    
    // Clamp translations to reasonable values
    translateX = Math.max(-50, Math.min(50, translateX));
    translateY = Math.max(-50, Math.min(50, translateY));
    
    if (translateX !== 0 || translateY !== 0) {
      transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
    }
    
    return {
      transform,
      transformOrigin: "center center",
    };
  };

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
        style={{
          ...(isHovered && !isMobile ? getCardStyle() : {}),
          transition: (isMobile || variant === "dashboard") ? "none" : "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: (isMobile || variant === "dashboard") ? "auto" : "transform",
        }}
      >
        <div
          className={cn(
            "relative block aspect-[2/3] rounded-lg overflow-hidden",
            isHovered && !isMobile && "z-40"
          )}
          style={{
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Poster Image - Always visible as fallback */}
          {posterPath ? (
            <Image
              src={getPosterUrl(posterPath, "w500")}
              alt={title}
              fill
              className={cn(
                "object-cover transition-opacity duration-300",
                // Only fade out poster on desktop when trailer is ready, never on mobile
                !isMobile && variant !== "dashboard" && shouldShowOverlay && finalTrailer && !finalIsLoading && finalTrailer.key ? "opacity-0" : "opacity-100"
              )}
              sizes="(max-width: 640px) 200px, 300px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No Image</span>
            </div>
          )}

          {/* Trailer Preview (desktop hover only - no autoplay on mobile or dashboard) - Overlays poster when ready */}
          {shouldShowOverlay && !isMobile && variant !== "dashboard" && finalTrailer && !finalIsLoading && finalTrailer.key && (
            <div className="absolute inset-0 z-0 pointer-events-none">
              <iframe
                src={getYouTubeEmbedUrl(finalTrailer.key)}
                className="w-full h-full"
                allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ pointerEvents: "none" }}
                title="Trailer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
            </div>
          )}

          {/* Hover Overlay with Info - Always visible on mobile, hover on desktop */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent",
              shouldShowOverlay ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            style={{
              transition: "opacity 0.3s ease-out",
            }}
            onClick={(e) => {
              // Prevent card click when clicking on overlay
              e.stopPropagation();
            }}
          >
            {/* Action Buttons - Different design for "more-like-this" variant */}
            {variant === "more-like-this" ? (
              <div className="absolute top-2 right-2 z-20 pointer-events-auto">
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
                "absolute flex items-center gap-2 z-20 pointer-events-auto",
                isMobile ? "top-1.5 right-1.5 gap-1" : "top-3 right-3 gap-2"
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

            {/* Content Info */}
            <div className={cn(
              "absolute bottom-0 left-0 right-0 space-y-2",
              isMobile ? "p-2.5" : "p-4"
            )}>
              {/* Action Buttons Row */}
              <div className={cn(
                "flex items-center mb-2",
                isMobile ? "gap-1" : "gap-1.5"
              )}
              >
                <Button
                  size="sm"
                  className={cn(
                    "rounded-full bg-white text-black hover:bg-white/90 font-medium cursor-pointer",
                    isMobile ? "h-6 px-2 text-[10px]" : "h-7 px-3 text-xs"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Prevent details modal from opening
                    setIsModalOpen(false);
                    setIsTrailerModalOpen(true);

                    // Only fetch if we don't have cached videos
                    if (!cachedVideosData?.results && attemptedFetchRef.current !== item.id && !isLoadingTrailer) {
                      fetchTrailerVideos();
                    }
                  }}
                >
                  <Play className={cn("fill-black", isMobile ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1")} />
                  {!isMobile && "Play"}
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