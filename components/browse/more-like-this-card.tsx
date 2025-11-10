"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Play, Plus, Heart } from "lucide-react";
import { TMDBMovie, TMDBSeries, getPosterUrl, TMDBVideo } from "@/lib/tmdb";
import { CircleActionButton } from "./circle-action-button";
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
  const [runtime, setRuntime] = useState<number | null>(null);
  const [isLoadingRuntime, setIsLoadingRuntime] = useState(false);

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

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch runtime if not available
  useEffect(() => {
    if (!initialRuntime && !runtime && !isLoadingRuntime) {
      setIsLoadingRuntime(true);
      fetch(`/api/${type === "movie" ? "movies" : "tv"}/${item.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (type === "movie" && data.runtime) {
            setRuntime(data.runtime);
          } else if (type === "tv" && data.episode_run_time?.[0]) {
            setRuntime(data.episode_run_time[0]);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingRuntime(false));
    }
  }, [item.id, type, initialRuntime, runtime, isLoadingRuntime]);

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
        {/* Section 1: Movie Poster - Reduced height */}
        <div className="relative aspect-[5/5] bg-muted overflow-hidden">
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

          {/* Like Button - Top Left */}
          <div className="absolute top-2 left-2 z-20">
            <CircleActionButton
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                // TODO: Handle like/favorite
              }}
            >
              <Heart className="h-3 w-3 text-white" />
            </CircleActionButton>
          </div>

          {/* Runtime - Top Right */}
          {runtimeText && (
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-medium z-20">
              {runtimeText}
            </div>
          )}

          {/* Centered Play Button - Revealed on hover with animation */}
          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
              isHovered || isMobile ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="bg-black/40 backdrop-blur-sm absolute inset-0" />
            <CircleActionButton
              size="md"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                // Open details sheet instead of trailer modal
                setIsDetailModalOpen(true);
              }}
              className="pointer-events-auto z-10"
            >
              <Play className="size-6 text-white fill-white" />
            </CircleActionButton>
          </div>

          {/* Loading state for play button */}
          {isLoadingTrailer && !trailer && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Section 2: Movie Details */}
        <div className="bg-card p-3 space-y-2">
          {/* Top Row: Release Date + Parental Control + Add Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {year && <span>{year}</span>}
              {year && <span>•</span>}
              <span className="px-1.5 py-0.5 bg-muted rounded text-xs font-medium">
                {parentalRating}
              </span>
            </div>
            <CircleActionButton
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                // TODO: Handle add to list
              }}
            >
              <Plus className="h-3 w-3 text-white" />
            </CircleActionButton>
          </div>

          {/* Bottom Row: Synopsis (Truncated to 4 lines) */}
          {item.overview && (
            <p className="text-xs text-foreground line-clamp-4 leading-snug">
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

