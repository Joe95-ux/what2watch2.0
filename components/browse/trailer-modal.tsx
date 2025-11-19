"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { TMDBVideo, getYouTubeEmbedUrl } from "@/lib/tmdb";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TrailerModalProps {
  video: TMDBVideo | null;
  videos?: TMDBVideo[]; // Optional: array of all videos for navigation
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isLoading?: boolean;
  hasNoVideos?: boolean;
  errorMessage?: string | null;
  onOpenDetails?: () => void;
  initialVideoId?: string | null;
}

export default function TrailerModal({
  video,
  videos,
  isOpen,
  onClose,
  title,
  isLoading = false,
  hasNoVideos = false,
  errorMessage,
  onOpenDetails,
  initialVideoId,
}: TrailerModalProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Filter to only YouTube videos - memoized to prevent unnecessary re-renders
  const youtubeVideos = useMemo(() => {
    const sourceVideos =
      videos && videos.length > 0 ? videos : video ? [video] : [];

    return sourceVideos.filter((v) => v.site === "YouTube");
  }, [videos, video]);

  const hasVideos = youtubeVideos.length > 0;
  const currentVideo = hasVideos
    ? youtubeVideos[Math.min(currentVideoIndex, youtubeVideos.length - 1)]
    : null;

  // Reset video index when modal opens or when selected video changes
  useEffect(() => {
    if (!isOpen) {
      setCurrentVideoIndex(0);
      if (iframeRef.current) {
        iframeRef.current.src = "";
      }
      return;
    }

    if (youtubeVideos.length === 0) {
      setCurrentVideoIndex(0);
      return;
    }

    if (initialVideoId) {
      const initialIndex = youtubeVideos.findIndex((v) => v.id === initialVideoId);
      if (initialIndex >= 0) {
        setCurrentVideoIndex(initialIndex);
        return;
      }
    }

    if (video) {
      const index = youtubeVideos.findIndex((v) => v.id === video.id);
      setCurrentVideoIndex(index >= 0 ? index : 0);
    } else {
      setCurrentVideoIndex(0);
    }
  }, [isOpen, video, youtubeVideos, initialVideoId]);

  // Ensure the index stays within bounds when the list of videos changes
  useEffect(() => {
    if (youtubeVideos.length === 0) {
      setCurrentVideoIndex(0);
    } else if (currentVideoIndex >= youtubeVideos.length) {
      setCurrentVideoIndex(0);
    }
  }, [youtubeVideos.length, currentVideoIndex]);

  const hasMultipleVideos = youtubeVideos.length > 1;
  const canGoPrev = hasMultipleVideos && currentVideoIndex > 0;
  const canGoNext =
    hasMultipleVideos && currentVideoIndex < youtubeVideos.length - 1;

  const handlePrev = useCallback(() => {
    if (canGoPrev) {
      setCurrentVideoIndex((index) => index - 1);
    }
  }, [canGoPrev]);

  const handleNext = useCallback(() => {
    if (canGoNext) {
      setCurrentVideoIndex((index) => index + 1);
    }
  }, [canGoNext]);

  const advanceToNextVideo = useCallback(() => {
    if (canGoNext) {
      setCurrentVideoIndex((index) => index + 1);
    } else if (hasMultipleVideos) {
      setCurrentVideoIndex(0);
    }
  }, [canGoNext, hasMultipleVideos]);

  const modalTitle = currentVideo
    ? `${title} - ${currentVideo.name}`
    : `${title} Trailers`;

  const descriptionText = hasVideos
    ? `Video player for ${title}. ${currentVideo?.official ? "Official" : ""} ${
        currentVideo?.type ?? ""
      } video. ${
        hasMultipleVideos
          ? `Video ${currentVideoIndex + 1} of ${youtubeVideos.length}.`
          : ""
      }`
    : errorMessage ??
      "No trailers are available for this title at the moment.";

  const emptyStateMessage =
    errorMessage ??
    (hasNoVideos
      ? "Oops! Trailer not available. Enjoy the movie poster and details below."
      : "We couldn't load trailers right now.");

  const handleClose = () => {
    // Stop video playback immediately
    if (iframeRef.current) {
      iframeRef.current.src = "";
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleYouTubeMessage = (event: MessageEvent) => {
      if (!event.origin.includes("youtube.com")) return;
      let data = event.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (typeof data === "object" && data !== null && data.event === "onStateChange") {
        if (data.info === 0) {
          advanceToNextVideo();
        }
      }
    };

    window.addEventListener("message", handleYouTubeMessage);
    return () => window.removeEventListener("message", handleYouTubeMessage);
  }, [isOpen, advanceToNextVideo]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[90vw] !w-full !h-[90vh] !max-h-[90vh] !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden p-0 gap-0 bg-black !border-gray-800 dark:!border-gray-800"
      >
        {/* Accessibility: Hidden title and description for screen readers */}
        <DialogTitle className="sr-only">{modalTitle}</DialogTitle>
        <DialogDescription className="sr-only">
          {descriptionText}
        </DialogDescription>
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-50 h-14 w-14 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-7 w-7 text-white" />
        </button>

        {/* Navigation Buttons */}
        {hasMultipleVideos && !isLoading && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              disabled={!canGoPrev}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 z-50 h-16 w-16 rounded-full",
                "bg-black/60 hover:bg-black/80 text-white",
                "transition-opacity duration-300",
                !canGoPrev ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              )}
              aria-label="Previous video"
            >
              <ChevronLeft className="size-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={!canGoNext}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-50 h-16 w-16 rounded-full",
                "bg-black/60 hover:bg-black/80 text-white",
                "transition-opacity duration-300",
                !canGoNext ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              )}
              aria-label="Next video"
            >
              <ChevronRight className="size-6" />
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
        {currentVideo && !isLoading && (
          <div className="absolute top-4 left-4 z-50 bg-black/60 px-4 py-2 rounded-lg max-w-md">
            <p className="text-white text-sm font-medium">{currentVideo.name}</p>
          </div>
        )}

        {/* Video Player / States */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-white" />
              <p className="text-white/80 text-sm">Loading trailers...</p>
            </div>
          ) : currentVideo && isOpen ? (
            <div className="relative w-full h-full">
              <iframe
                ref={iframeRef}
                key={currentVideo.id} // Force re-render when video changes
                src={getYouTubeEmbedUrl(currentVideo.key, true)}
                className="w-full h-full"
                allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`${title} - ${currentVideo.name}`}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 px-6 text-center">
              <p className="text-white text-lg font-semibold">
                {emptyStateMessage}
              </p>
              {hasNoVideos && (
                <>
                  <p className="text-white/70 text-sm max-w-sm">
                    We couldn’t find any trailers for <span className="font-semibold">{title}</span> at the moment.
                  </p>
                  {onOpenDetails && (
                    <Button
                      size="sm"
                      className="mt-2 cursor-pointer"
                      onClick={() => {
                        onClose();
                        onOpenDetails();
                      }}
                    >
                      View Movie Details
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

