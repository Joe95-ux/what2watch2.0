"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Play, Plus } from "lucide-react";
import { TMDBMovie, TMDBSeries, getPosterUrl, TMDBVideo } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import TrailerModal from "./trailer-modal";
import ContentDetailModal from "./content-detail-modal";

interface MoreLikeThisCardProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
}

export default function MoreLikeThisCard({ item, type }: MoreLikeThisCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [trailer, setTrailer] = useState<TMDBVideo | null>(null);
  const [allVideos, setAllVideos] = useState<TMDBVideo[]>([]);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const title = "title" in item ? item.title : item.name;
  const posterPath = item.poster_path || item.backdrop_path;
  const releaseDate = type === "movie" ? (item as TMDBMovie).release_date : (item as TMDBSeries).first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  
  // Get parental rating - TMDB doesn't always provide this, so we'll use a simple fallback
  const parentalRating = type === "movie" 
    ? ((item as TMDBMovie).adult ? "R" : "PG-13")
    : "TV-MA";

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch trailer on hover (with delay to avoid too many requests)
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!trailer && !isLoadingTrailer) {
      setTimeout(async () => {
        setIsLoadingTrailer(true);
        try {
          const response = await fetch(`/api/${type === "movie" ? "movies" : "tv"}/${item.id}/videos`);
          if (response.ok) {
            const data = await response.json();
            const videos = data.results || [];
            setAllVideos(videos);
            // Find first trailer
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
      }, 300);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (trailer) {
      setIsTrailerModalOpen(true);
    }
  };

  const handleCardClick = () => {
    setIsDetailModalOpen(true);
  };

  return (
    <>
      <div
        className="relative bg-card rounded-lg overflow-hidden cursor-pointer group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleCardClick}
      >
        {/* Section 1: Movie Poster */}
        <div className="relative aspect-[2/3] bg-muted">
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

          {/* Hover Overlay with Action Buttons */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-none transition-opacity duration-300 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Action Buttons Row */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-center gap-1.5 mb-2 pointer-events-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 rounded-full p-0 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Open details sheet instead of trailer modal
                    setIsDetailModalOpen(true);
                  }}
                >
                  <Play className="h-3 w-3 text-white size-3 fill-white" />
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
                  <Plus className="h-3 w-3 text-white size-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Loading state for play button */}
          {isLoadingTrailer && !trailer && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Section 2: Movie Details - Reduced height */}
        <div className="bg-card p-3 space-y-2">
          {/* Top Row: Release Date + Parental Control */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {year && <span>{year}</span>}
            {year && <span>•</span>}
            <span className="px-1.5 py-0.5 bg-muted rounded text-xs font-medium">
              {parentalRating}
            </span>
          </div>

          {/* Bottom Row: Synopsis (Truncated) */}
          {item.overview && (
            <p className="text-xs text-foreground line-clamp-2 leading-snug">
              {item.overview}
            </p>
          )}
        </div>
      </div>

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

      {/* Detail Modal */}
      <ContentDetailModal
        item={item}
        type={type}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </>
  );
}

