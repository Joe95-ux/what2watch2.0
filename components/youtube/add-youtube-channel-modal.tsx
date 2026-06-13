"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { YouTubeChannelExtractorInline } from "@/components/youtube/youtube-channel-extractor-inline";

interface AddYouTubeChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddYouTubeChannelModal({ open, onOpenChange }: AddYouTubeChannelModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-4 sm:px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>Add a channel</DialogTitle>
          <DialogDescription>
            Search by name or paste a YouTube channel URL. New channels are added to the directory and
            can be added to your feed.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-4">
          <YouTubeChannelExtractorInline
            variant="plain"
            onChannelAdded={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
