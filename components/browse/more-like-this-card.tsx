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

          {/* Watch Time Indicator (Top Right) - Optional, can be removed if not needed */}
          {/* <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs text-white flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>2h 15m</span>
          </div> */}

          {/* Play Button - Centered, visible on hover (desktop) or always (mobile) */}
          {(isHovered || isMobile) && trailer && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <Button
                size="lg"
                className="h-16 w-16 rounded-full bg-white/90 hover:bg-white text-black shadow-lg hover:shadow-xl transition-all"
                onClick={handlePlayClick}
              >
                <Play className="h-8 w-8 fill-black" />
              </Button>
            </div>
          )}

          {/* Loading state for play button */}
          {isLoadingTrailer && !trailer && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Section 2: Movie Details */}
        <div className="bg-card p-4 space-y-3">
          {/* Top Row: Release Date + Parental Control (Left) | Add Button (Right) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {year && <span>{year}</span>}
              {year && <span>•</span>}
              <span className="px-1.5 py-0.5 bg-muted rounded text-xs font-medium">
                {parentalRating}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-full p-0 bg-muted hover:bg-muted/80"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // TODO: Handle add to playlist
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Bottom Row: Synopsis (Truncated) */}
          {item.overview && (
            <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
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

