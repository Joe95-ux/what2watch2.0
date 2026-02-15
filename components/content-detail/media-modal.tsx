"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { TMDBVideo, getYouTubeEmbedUrl, getImageUrl } from "@/lib/tmdb";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

type MediaItem = 
  | { type: "video"; data: TMDBVideo }
  | { type: "image"; data: { file_path: string } };

interface MediaModalProps {
  items: MediaItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export default function MediaModal({
  items,
  initialIndex,
  isOpen,
  onClose,
  title,
}: MediaModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Update index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  // Stop video playback when modal closes
  useEffect(() => {
    if (!isOpen && iframeRef.current) {
      iframeRef.current.src = "";
    }
  }, [isOpen]);

  const currentItem = items[currentIndex];
  const hasMultiple = items.length > 1;
  const canGoPrev = hasMultiple && currentIndex > 0;
  const canGoNext = hasMultiple && currentIndex < items.length - 1;

  const handlePrev = useCallback(() => {
    if (canGoPrev) {
      setCurrentIndex((index) => index - 1);
    }
  }, [canGoPrev]);

  const handleNext = useCallback(() => {
    if (canGoNext) {
      setCurrentIndex((index) => index + 1);
    }
  }, [canGoNext]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && canGoPrev) {
        handlePrev();
      } else if (e.key === "ArrowRight" && canGoNext) {
        handleNext();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, canGoPrev, canGoNext, handlePrev, handleNext, onClose]);

  if (!currentItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[90vw] !w-full !h-[90vh] !max-h-[90vh] !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden p-0 gap-0 bg-black !border-gray-800 dark:!border-gray-800"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 h-14 w-14 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-7 w-7 text-white" />
        </button>

        {/* Navigation Buttons */}
        {hasMultiple && (
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
              aria-label="Previous"
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
              aria-label="Next"
            >
              <ChevronRight className="size-6" />
            </Button>

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/60 px-4 py-2 rounded-full">
              <span className="text-white text-sm">
                {currentIndex + 1} / {items.length}
              </span>
            </div>
          </>
        )}

        {/* Media Content */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          {currentItem.type === "video" ? (
            <div className="relative w-full h-full">
              <iframe
                ref={iframeRef}
                key={currentItem.data.id}
                src={getYouTubeEmbedUrl(currentItem.data.key, true)}
                className="w-full h-full"
                allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={currentItem.data.name}
              />
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <Image
                src={getImageUrl(currentItem.data.file_path, "original")}
                alt={`${title} - Image ${currentIndex + 1}`}
                fill
                className="object-contain"
                unoptimized
                priority
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

