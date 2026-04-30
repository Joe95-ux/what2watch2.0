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
        className={cn(
          "!max-w-[90vw] !w-full !h-[90vh] !max-h-[90vh] !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden p-0 gap-0 bg-black !border-gray-800 dark:!border-gray-800",
          currentItem.type === "video" && "grid grid-rows-[auto_minmax(0,1fr)_auto]"
        )}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {currentItem.type === "video" ? (
          <div className="flex h-12 items-center justify-between border-b border-gray-800 px-4 text-white">
            <p className="truncate text-sm font-medium">{currentItem.data.name || title}</p>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 h-14 w-14 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-7 w-7 text-white" />
          </button>
        )}

        {/* Navigation Buttons */}
        {hasMultiple && currentItem.type !== "video" && (
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
        <div className="relative min-h-0 w-full bg-black">
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
        {currentItem.type === "video" ? (
          <div className="grid h-12 grid-cols-3 items-center border-t border-gray-800 px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={!canGoPrev}
              className={cn(
                "justify-self-start cursor-pointer text-white hover:bg-white/10",
                !hasMultiple && "pointer-events-none opacity-0",
                hasMultiple && !canGoPrev && "cursor-not-allowed opacity-50"
              )}
              aria-label="Previous"
            >
              <ChevronLeft className="mr-1 size-4" />
              Previous
            </Button>
            <span className="text-xs text-white/70">
              {currentIndex + 1} / {items.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={!canGoNext}
              className={cn(
                "justify-self-end cursor-pointer text-white hover:bg-white/10",
                !hasMultiple && "pointer-events-none opacity-0",
                hasMultiple && !canGoNext && "cursor-not-allowed opacity-50"
              )}
              aria-label="Next"
            >
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

