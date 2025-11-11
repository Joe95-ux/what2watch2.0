"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

interface MovieCardProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  className?: string;
  canScrollPrev?: boolean;
  canScrollNext?: boolean;
  variant?: "default" | "more-like-this";
}

export default function MovieCard({ item, type, className, canScrollPrev = false, canScrollNext = false, variant = "default" }: MovieCardProps) {
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
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptedFetchRef = useRef<number | null>(null);
  const [hasNoVideos, setHasNoVideos] = useState(false);
  const [trailerError, setTrailerError] = useState<string | null>(null);
  
  const shouldShowOverlay = isHovered || isMobile;

  const title = "title" in item ? item.title : item.name;
  const posterPath = item.poster_path || item.backdrop_path;
  const releaseDate = type === "movie" ? (item as TMDBMovie).release_date : (item as TMDBSeries).first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;

  // Reset states when modal opens or item changes
  useEffect(() => {
    if (isModalOpen) {
      setIsHovered(false);
      cleanupTimeouts();
    }
  }, [isModalOpen]);

  useEffect(() => {
    return () => {
      cleanupTimeouts();
    };
  }, []);

  // Reset fetch state when item changes
  useEffect(() => {
    attemptedFetchRef.current = null;
    setTrailer(null);
    setAllVideos([]);
    setHasNoVideos(false);
    setTrailerError(null);
    setIsLoadingTrailer(false);
    cleanupTimeouts();
  }, [item.id]);

  const cleanupTimeouts = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }
  };

  const fetchTrailerVideos = useCallback(async (retryCount = 0) => {
    // Prevent duplicate fetches
    if (attemptedFetchRef.current === item.id && retryCount === 0) {
      return;
    }

    attemptedFetchRef.current = item.id;
    setIsLoadingTrailer(true);
    setTrailerError(null);
    setHasNoVideos(false);

    try {
      const response = await fetch(`/api/${type}/${item.id}/videos`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch trailers`);
      }

      const data = await response.json();
      const videos = data.results || [];
      setAllVideos(videos);

      // Find trailer with better fallback logic
      const officialTrailer = videos.find(
        (v: TMDBVideo) => v.type === "Trailer" && v.official && v.site === "YouTube"
      );
      const anyTrailer = videos.find(
        (v: TMDBVideo) => v.type === "Trailer" && v.site === "YouTube"
      );
      const teaser = videos.find(
        (v: TMDBVideo) => v.type === "Teaser" && v.site === "YouTube"
      );
      
      const foundTrailer = officialTrailer || anyTrailer || teaser || videos[0] || null;
      setTrailer(foundTrailer);

      const noVideosAvailable = videos.length === 0;
      setHasNoVideos(noVideosAvailable);
      
      if (noVideosAvailable) {
        setTrailerError("No trailers available for this title.");
      } else if (!foundTrailer) {
        setTrailerError("No playable trailers found.");
      }
    } catch (error) {
      console.error("Error fetching trailer:", error);
      
      // Retry logic (max 2 retries)
      if (retryCount < 2) {
        fetchTimeoutRef.current = setTimeout(() => {
          fetchTrailerVideos(retryCount + 1);
        }, 1000 * (retryCount + 1));
        return;
      }
      
      setTrailerError("Unable to load trailers. Please try again later.");
      attemptedFetchRef.current = null; // Allow retry on next interaction
    } finally {
      setIsLoadingTrailer(false);
    }
  }, [item.id, type]);

  // Optimized hover handling with debouncing
  useEffect(() => {
    if (!shouldShowOverlay || isModalOpen) {
      return;
    }

    // Only fetch if we haven't attempted or if previous attempt failed
    const shouldFetch = attemptedFetchRef.current !== item.id || 
                       (trailerError && !isLoadingTrailer);

    if (shouldFetch) {
      hoverTimeoutRef.current = setTimeout(() => {
        fetchTrailerVideos();
      }, isMobile ? 100 : 300); // Small delay to avoid excessive requests
    }

    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [shouldShowOverlay, isModalOpen, fetchTrailerVideos, isMobile, item.id, trailerError, isLoadingTrailer]);

  // Fixed card scaling - prevent play button shrinking
  const getCardStyle = () => {
    if (isMobile || !isHovered || !cardRef.current) return {};
    
    const rect = cardRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    
    const isUnderLeftGradient = canScrollPrev && rect.left < 64;
    const isUnderRightGradient = canScrollNext && rect.right > viewportWidth - 64;
    
    if (isUnderLeftGradient || isUnderRightGradient) {
      return {};
    }
    
    const scale = variant === "more-like-this" ? 1.15 : 1.5;
    
    // Calculate positioning to avoid off-screen issues
    const scaledWidth = rect.width * scale;
    const scaledHeight = rect.height * scale;
    const scaleOffsetX = (scaledWidth - rect.width) / 2;
    const scaleOffsetY = (scaledHeight - rect.height) / 2;
    
    const scaledLeft = rect.left - scaleOffsetX;
    const scaledRight = rect.right + scaleOffsetX;
    
    let translateX = 0;
    
    if (scaledRight > viewportWidth - 20) {
      translateX = -(scaledRight - viewportWidth + 20);
    } else if (scaledLeft < 20) {
      translateX = 20 - scaledLeft;
    }
    
    // Clamp translation to prevent extreme shifts
    translateX = Math.max(-100, Math.min(100, translateX));
    
    return {
      transform: `scale(${scale}) translateX(${translateX}px)`,
      transformOrigin: "center center",
    };
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsTrailerModalOpen(true);
    
    // Force fetch if not already loaded or if previous attempt failed
    if ((attemptedFetchRef.current !== item.id || trailerError) && !isLoadingTrailer) {
      fetchTrailerVideos();
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't open detail modal if clicking interactive elements
    if (target.closest("button") || target.closest('[role="button"]')) {
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <div
        ref={cardRef}
        className={cn(
          "relative group flex-shrink-0 cursor-pointer",
          isHovered && !isMobile && "z-[100]",
          className
        )}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => {
          if (!isMobile) {
            setIsHovered(false);
            // Don't clear trailer immediately - keep it for smooth transitions
          }
        }}
        onClick={handleCardClick}
        style={{
          ...(isHovered && !isMobile ? getCardStyle() : {}),
          transition: isMobile ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          className={cn(
            "relative block aspect-[2/3] rounded-lg overflow-hidden",
            isHovered && !isMobile && "z-[100]"
          )}
          style={{
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Trailer Preview */}
          {shouldShowOverlay && trailer && !isLoadingTrailer && (
            <div className="absolute inset-0 z-0 pointer-events-none">
              <iframe
                src={getYouTubeEmbedUrl(trailer.key, true)} // Add autoplay param
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ pointerEvents: "none" }}
                title={`${title} Trailer`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
            </div>
          )}

          {/* Poster Image */}
          {(!shouldShowOverlay || !trailer || isLoadingTrailer) && (
            <>
              {posterPath ? (
                <Image
                  src={getPosterUrl(posterPath, "w500")}
                  alt={title}
                  fill
                  className="object-cover transition-transform duration-300"
                  sizes="(max-width: 640px) 200px, 300px"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">No Image</span>
                </div>
              )}
            </>
          )}

          {/* Loading State */}
          {isLoadingTrailer && shouldShowOverlay && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <div className="text-white text-sm">Loading trailer...</div>
            </div>
          )}

          {/* Hover Overlay */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent",
              shouldShowOverlay ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            style={{
              transition: "opacity 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Buttons */}
            {variant === "more-like-this" ? (
              <div className="absolute top-2 right-2 z-20 pointer-events-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "rounded-full p-0 bg-white hover:bg-white/90 text-black shadow-lg hover:shadow-xl transition-all cursor-pointer",
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
              {/* Action Buttons Row - Fixed to prevent scaling issues */}
              <div className={cn(
                "flex items-center mb-2",
                isMobile ? "gap-1" : "gap-1.5"
              )}>
                <Button
                  size="sm"
                  className={cn(
                    "rounded-full bg-white text-black hover:bg-white/90 font-medium cursor-pointer transition-all",
                    "transform-none", // Prevent button from being affected by parent scale
                    isMobile ? "h-6 px-2 text-[10px]" : "h-7 px-3 text-xs"
                  )}
                  onClick={handlePlayClick}
                  disabled={isLoadingTrailer}
                >
                  {isLoadingTrailer ? (
                    <span className={cn("animate-pulse", isMobile ? "text-[8px]" : "text-xs")}>
                      ...
                    </span>
                  ) : (
                    <>
                      <Play className={cn("fill-black", isMobile ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1")} />
                      {!isMobile && "Play"}
                    </>
                  )}
                </Button>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <AddToPlaylistDropdown
                        item={item}
                        type={type}
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

              {/* Rest of your content info remains the same */}
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

              <h3 className={cn(
                "font-bold text-white line-clamp-1",
                isMobile ? "text-xs" : "text-sm"
              )}>{title}</h3>

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

      {/* Modals */}
      <ContentDetailModal
        item={item}
        type={type}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {isTrailerModalOpen && (
        <TrailerModal
          video={trailer}
          videos={allVideos}
          isOpen={isTrailerModalOpen}
          onClose={() => setIsTrailerModalOpen(false)}
          title={title}
          isLoading={isLoadingTrailer}
          hasNoVideos={hasNoVideos}
          errorMessage={trailerError}
          onOpenDetails={() => {
            setIsModalOpen(true);
          }}
        />
      )}
    </>
  );
}