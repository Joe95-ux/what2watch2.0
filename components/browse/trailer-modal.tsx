"use client";

import { useState, useEffect, useMemo } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { TMDBVideo, getYouTubeEmbedUrl } from "@/lib/tmdb";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TrailerModalProps {
  video: TMDBVideo | null;
  videos?: TMDBVideo[]; // Optional: array of all videos for navigation
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export default function TrailerModal({
  video,
  videos,
  isOpen,
  onClose,
  title,
}: TrailerModalProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  // Filter to only YouTube videos - memoized to prevent unnecessary re-renders
  const youtubeVideos = useMemo(() => {
    return videos
      ? videos.filter((v) => v.site === "YouTube")
      : video
      ? [video]
      : [];
  }, [videos, video]);

  const currentVideo = youtubeVideos[currentVideoIndex] || video;

  // Reset to first video when modal opens
  useEffect(() => {
    if (isOpen && videos && video) {
      const index = youtubeVideos.findIndex((v) => v.id === video.id);
      setCurrentVideoIndex(index >= 0 ? index : 0);
    }
  }, [isOpen, video, videos, youtubeVideos]);

  if (!currentVideo) return null;

  const hasMultipleVideos = youtubeVideos.length > 1;
  const canGoPrev = hasMultipleVideos && currentVideoIndex > 0;
  const canGoNext = hasMultipleVideos && currentVideoIndex < youtubeVideos.length - 1;

  const handlePrev = () => {
    if (canGoPrev) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[90vw] !w-full !h-[90vh] !max-h-[90vh] !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden p-0 gap-0 bg-black"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {/* Navigation Buttons */}
        {hasMultipleVideos && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              disabled={!canGoPrev}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full",
                "bg-black/60 hover:bg-black/80 text-white",
                "transition-opacity duration-300",
                !canGoPrev && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Previous video"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={!canGoNext}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full",
                "bg-black/60 hover:bg-black/80 text-white",
                "transition-opacity duration-300",
                !canGoNext && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Next video"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            {/* Video Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/60 px-4 py-2 rounded-full">
              <span className="text-white text-sm">
                {currentVideoIndex + 1} / {youtubeVideos.length}
              </span>
            </div>
          </>
        )}

        {/* Video Info */}
        <div className="absolute top-4 left-4 z-50 bg-black/60 px-4 py-2 rounded-lg max-w-md">
          <p className="text-white text-sm font-medium">{currentVideo.name}</p>
          {currentVideo.official && (
            <span className="text-white/80 text-xs">Official</span>
          )}
        </div>

        {/* Video Player */}
        <div className="relative w-full h-full">
          <iframe
            key={currentVideo.id} // Force re-render when video changes
            src={getYouTubeEmbedUrl(currentVideo.key, true)}
            className="w-full h-full"
            allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`${title} - ${currentVideo.name}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

