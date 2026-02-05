"use client";

import { useState, useEffect } from "react";
import { Heart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { getPosterUrl } from "@/lib/tmdb";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

interface ContentSelectionProps {
  phase: number;
  onContentLiked: (content: { id: number; type: "movie" | "tv"; genreIds: number[] }) => void;
  onContentDisliked: (content: { id: number; type: "movie" | "tv" }) => void;
  onPhaseComplete: () => void;
}

type ContentItem = (TMDBMovie & { type: "movie" }) | (TMDBSeries & { type: "tv" });

export default function ContentSelection({
  phase,
  onContentLiked,
  onContentDisliked,
  onPhaseComplete,
}: ContentSelectionProps) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [interacted, setInteracted] = useState<Set<number>>(new Set());
  const [cardKey, setCardKey] = useState(0); // Force re-render for animation
  const [isTransitioning, setIsTransitioning] = useState(false); // Prevent multiple rapid clicks

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setCurrentIndex(0);
      setCardKey(0);
      setInteracted(new Set());
      try {
        const response = await fetch(`/api/onboarding/content?phase=${phase}`);
        const data = await response.json();

        if (data.results) {
          const shuffled = [...data.results].sort(() => Math.random() - 0.5);
          setContent(shuffled.slice(0, 10));
        }
      } catch (error) {
        console.error("Error fetching onboarding content:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [phase]);

  const handleLike = () => {
    if (isTransitioning || currentIndex >= content.length) return;

    const item = content[currentIndex];
    if (interacted.has(item.id)) {
      // If already interacted, just move to next
      moveToNext();
      return;
    }

    setIsTransitioning(true);
    setInteracted(new Set([...interacted, item.id]));

    try {
      const genreIds = "genre_ids" in item ? item.genre_ids : [];

      onContentLiked({
        id: item.id,
        type: item.type,
        genreIds,
      });

      moveToNext();
    } catch (error) {
      console.error("Error handling like:", error);
      // Still move to next even if callback fails
      moveToNext();
    } finally {
      // Reset transitioning state after a short delay to allow animation
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handleDislike = () => {
    if (isTransitioning || currentIndex >= content.length) return;

    const item = content[currentIndex];
    if (interacted.has(item.id)) {
      // If already interacted, just move to next
      moveToNext();
      return;
    }

    setIsTransitioning(true);
    setInteracted(new Set([...interacted, item.id]));

    try {
      onContentDisliked({
        id: item.id,
        type: item.type,
      });

      moveToNext();
    } catch (error) {
      console.error("Error handling dislike:", error);
      // Still move to next even if callback fails
      moveToNext();
    } finally {
      // Reset transitioning state after a short delay to allow animation
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const moveToNext = () => {
    if (currentIndex < content.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setCardKey((prev) => prev + 1); // Trigger animation
    } else {
      onPhaseComplete();
    }
  };

  const handleSkip = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    moveToNext();
    setTimeout(() => setIsTransitioning(false), 300);
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto flex justify-center min-h-[350px] sm:min-h-[400px] items-center">
        <Skeleton className="h-[350px] sm:h-[400px] w-auto max-w-md rounded-lg" />
      </div>
    );
  }

  if (content.length === 0 || currentIndex >= content.length) {
    return null;
  }

  const currentItem = content[currentIndex];
  const title = currentItem.type === "movie" ? currentItem.title : currentItem.name;
  const releaseDate = currentItem.type === "movie" ? currentItem.release_date : currentItem.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  const posterPath = currentItem.poster_path || currentItem.backdrop_path;

  // Random animation variations for Pinterest-like effect
  const animationVariants = [
    "animate-in fade-in slide-in-from-bottom-8 zoom-in-95 duration-500",
    "animate-in fade-in slide-in-from-left-8 zoom-in-95 duration-500",
    "animate-in fade-in slide-in-from-right-8 zoom-in-95 duration-500",
    "animate-in fade-in slide-in-from-top-8 zoom-in-95 duration-500",
  ];
  const randomAnimation = animationVariants[currentIndex % animationVariants.length];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Content Card with Pinterest-like animation - container uses more horizontal space */}
      <div className="flex justify-center">
        <div
          key={`${currentItem.id}-${cardKey}`}
          className={cn(
            "relative w-auto h-[400px] max-w-md rounded-lg overflow-hidden shadow-2xl group",
            "aspect-[4/5] sm:aspect-[3/4] md:aspect-[2/3]",
            randomAnimation
          )}
          style={{
            animationDelay: "0ms",
          }}
        >
          {posterPath ? (
            <Image
              src={getPosterUrl(posterPath, "w500")}
              alt={title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 400px"
              unoptimized
              onError={(e) => {
                // Fallback to placeholder on error
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const placeholder = target.parentElement?.querySelector('.image-placeholder') as HTMLElement;
                if (placeholder) placeholder.style.display = 'flex';
              }}
            />
          ) : null}
          {/* Placeholder for image errors */}
          <div className="image-placeholder absolute inset-0 w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center" style={{ display: posterPath ? 'none' : 'flex' }}>
            <span className="text-muted-foreground">No Image</span>
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

          {/* Content Info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-primary/20 text-primary text-xs font-medium">
                {currentItem.type === "movie" ? "Movie" : "TV Show"}
              </span>
              {year && (
                <span className="text-sm text-white/80">{year}</span>
              )}
              {currentItem.vote_average > 0 && (
                <span className="text-sm text-white/80">
                  ⭐ {currentItem.vote_average.toFixed(1)}
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-white line-clamp-2">{title}</h3>
            {currentItem.overview && (
              <p className="text-sm text-white/90 line-clamp-3">{currentItem.overview}</p>
            )}
          </div>

          {/* Floating animation effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-white/20 animate-ping" />
            <div className="absolute bottom-20 left-4 w-1.5 h-1.5 rounded-full bg-white/15 animate-pulse" style={{ animationDelay: "500ms" }} />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handleDislike}
          disabled={isTransitioning}
          className="flex items-center justify-center cursor-pointer w-16 h-16 rounded-full bg-background border-2 border-border hover:border-destructive hover:bg-destructive/10 transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Dislike"
        >
          <X className="h-6 w-6 text-destructive" />
        </button>

        <button
          onClick={handleSkip}
          disabled={isTransitioning}
          className="px-6 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Skip
        </button>

        <button
          onClick={handleLike}
          disabled={isTransitioning}
          className="flex items-center justify-center cursor-pointer w-16 h-16 rounded-full bg-gradient-to-r from-[#066f72] to-[#0d9488] hover:from-[#055a5d] hover:to-[#0a7a6e] transition-all hover:scale-110 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Like"
        >
          <Heart className="h-6 w-6 text-white fill-white" />
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2">
        {content.map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              index <= currentIndex
                ? "bg-gradient-to-r from-[#066f72] to-[#0d9488] w-8"
                : "bg-muted w-2"
            )}
          />
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {currentIndex + 1} of {content.length}
      </p>
    </div>
  );
}
