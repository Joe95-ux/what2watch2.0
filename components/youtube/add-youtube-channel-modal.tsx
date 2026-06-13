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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a channel</DialogTitle>
          <DialogDescription>
            Search by name or paste a YouTube channel URL. New channels are added to the directory and
            can be added to your feed.
          </DialogDescription>
        </DialogHeader>
        <YouTubeChannelExtractorInline
          variant="plain"
          onChannelAdded={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
