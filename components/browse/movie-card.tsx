"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Star, Play, Plus, Info, Maximize2 } from "lucide-react";
import { TMDBMovie, TMDBSeries, getPosterUrl, TMDBVideo, getYouTubeEmbedUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ContentDetailModal from "./content-detail-modal";
import TrailerModal from "./trailer-modal";

interface MovieCardProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  className?: string;
  canScrollPrev?: boolean;
  canScrollNext?: boolean;
  variant?: "default" | "more-like-this"; // Variant for different card styles
}

export default function MovieCard({ item, type, className, canScrollPrev = false, canScrollNext = false, variant = "default" }: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [trailer, setTrailer] = useState<TMDBVideo | null>(null);
  const [allVideos, setAllVideos] = useState<TMDBVideo[]>([]);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Fetch trailer on hover (with delay to avoid too many requests)
  useEffect(() => {
    if (isHovered && !trailer && !isLoadingTrailer && !isModalOpen) {
      hoverTimeoutRef.current = setTimeout(async () => {
        setIsLoadingTrailer(true);
        try {
          const response = await fetch(`/api/${type}/${item.id}/videos`);
          if (response.ok) {
            const data = await response.json();
            const videos = data.results || [];
            setAllVideos(videos);
            // Find first trailer (prefer official trailers)
            const officialTrailer = videos.find(
              (v: TMDBVideo) => v.type === "Trailer" && v.official && v.site === "YouTube"
            );
            const anyTrailer = videos.find(
              (v: TMDBVideo) => v.type === "Trailer" && v.site === "YouTube"
            );
            setTrailer(officialTrailer || anyTrailer || null);
          }
        } catch (error) {
          console.error("Error fetching trailer:", error);
        } finally {
          setIsLoadingTrailer(false);
        }
      }, 500); // 500ms delay before fetching
    }

    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [isHovered, item.id, type, trailer, isLoadingTrailer, isModalOpen]);

  // Calculate position to prevent card from going off-screen
  const getCardStyle = () => {
    if (!isHovered || !cardRef.current) return {};
    
    const rect = cardRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    
    // Check if card is under gradient area (first 64px from viewport edges)
    // Only prevent scaling if gradients are actually visible (when can scroll)
    const isUnderLeftGradient = canScrollPrev && rect.left < 64;
    const isUnderRightGradient = canScrollNext && rect.right > viewportWidth - 64;
    
    // Don't scale if under gradient area AND gradients are visible
    if (isUnderLeftGradient || isUnderRightGradient) {
      return {};
    }
    
    // Check if card would go off right edge
    const wouldOverflowRight = rect.right > viewportWidth - 20;
    // Check if card would go off left edge
    const wouldOverflowLeft = rect.left < 20;
    
    // Different scale for "more-like-this" variant (smaller scale like Netflix)
    const scale = variant === "more-like-this" ? "1.15" : "1.5";
    let transform = `scale(${scale})`;
    
    // Only adjust if absolutely necessary to prevent going off-screen
    if (wouldOverflowRight && !wouldOverflowLeft) {
      // Shift left slightly
      const overflow = rect.right - viewportWidth + 20;
      transform = `scale(${scale}) translateX(-${Math.min(overflow, 50)}px)`;
    } else if (wouldOverflowLeft && !wouldOverflowRight) {
      // Shift right slightly
      const overflow = 20 - rect.left;
      transform = `scale(${scale}) translateX(${Math.min(overflow, 50)}px)`;
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
          isHovered && "z-[100]",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setTrailer(null); // Clear trailer when not hovering
        }}
        style={{
          ...(isHovered ? getCardStyle() : {}),
          transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: "transform",
        }}
      >
        <div
          className={cn(
            "relative block aspect-[2/3] rounded-lg overflow-hidden",
            isHovered && "z-[100] shadow-2xl"
          )}
          style={{
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Trailer Preview (on hover) */}
          {isHovered && trailer && !isLoadingTrailer && (
            <div className="absolute inset-0 z-10">
              <iframe
                src={getYouTubeEmbedUrl(trailer.key)}
                className="w-full h-full"
                allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ pointerEvents: "none" }}
                title="Trailer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
            </div>
          )}

          {/* Poster Image (fallback or when no trailer) */}
          {(!isHovered || !trailer) && (
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

          {/* Hover Overlay with Info */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-none",
              isHovered ? "opacity-100" : "opacity-0"
            )}
            style={{
              transition: "opacity 0.3s ease-out",
            }}
          >
            {/* Action Buttons - Different design for "more-like-this" variant */}
            {variant === "more-like-this" ? (
              <div className="absolute top-2 right-2 z-20 pointer-events-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 rounded-full p-0 bg-white hover:bg-white/90 text-black shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsModalOpen(true);
                  }}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="absolute top-3 right-3 flex items-center gap-2 z-20 pointer-events-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 rounded-full p-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/30 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsModalOpen(true);
                  }}
                >
                  <Maximize2 className="h-4 w-4 text-white" />
                </Button>
              </div>
            )}

            {/* Content Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              {/* Action Buttons Row */}
              <div className="flex items-center gap-1.5 mb-2">
                <Button
                  size="sm"
                  className="h-7 px-3 rounded-full bg-white text-black hover:bg-white/90 font-medium text-xs cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (trailer) {
                      setIsTrailerModalOpen(true);
                    }
                  }}
                  disabled={!trailer}
                >
                  <Play className="h-3 w-3 mr-1 fill-black" />
                  Play
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 rounded-full p-0 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // TODO: Handle add to list
                  }}
                >
                  <Plus className="h-3 w-3 text-white" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 rounded-full p-0 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsModalOpen(true);
                  }}
                >
                  <Info className="h-3 w-3 text-white" />
                </Button>
              </div>

              {/* Rating and Type */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-semibold text-white">
                    {item.vote_average.toFixed(1)}
                  </span>
                </div>
                {year && (
                  <>
                    <span className="text-xs text-white/80">•</span>
                    <span className="text-xs text-white/80">{year}</span>
                  </>
                )}
                <span className="text-xs text-white/80">•</span>
                <span className="text-xs text-white/80 uppercase">{type === "movie" ? "Movie" : "TV"}</span>
              </div>

              {/* Title */}
              <h3 className="font-bold text-white text-sm line-clamp-1">{title}</h3>

              {/* Overview */}
              {item.overview && (
                <p className="text-xs text-white/90 line-clamp-2 leading-relaxed">
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
      {trailer && (
        <TrailerModal
          video={trailer}
          videos={allVideos}
          isOpen={isTrailerModalOpen}
          onClose={() => setIsTrailerModalOpen(false)}
          title={title}
        />
      )}
    </>
  );
}