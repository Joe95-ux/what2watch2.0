"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ChannelReviewStats } from "@/hooks/use-youtube-channel-reviews";
import { ChannelReviewRatingSummary } from "@/components/youtube/channel-review-rating-summary";

interface ChannelCuratorNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelTitle: string;
  channelThumbnail: string | null;
  note: string;
  /** From GET /api/youtube/channel-reviews (stats block) */
  reviewStats: ChannelReviewStats | null | undefined;
  isReviewStatsLoading?: boolean;
  /** Fallback when stats not loaded (e.g. average from channels/all) */
  channelRating?: { average: number; count: number } | null;
}

function initialsFromTitle(title: string) {
  const t = title.trim();
  if (!t) return "YT";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  return t.slice(0, 2).toUpperCase();
}

export function ChannelCuratorNoteDialog({
  open,
  onOpenChange,
  channelTitle,
  channelThumbnail,
  note,
  reviewStats,
  isReviewStatsLoading,
  channelRating,
}: ChannelCuratorNoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Curator note — {channelTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-6 pb-4 border-b border-border">
          <div className="flex gap-4 items-start">
            <Avatar className="h-16 w-16 shrink-0 rounded-full border border-border">
              {channelThumbnail ? (
                <AvatarImage
                  src={channelThumbnail}
                  alt={channelTitle}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="text-lg font-semibold rounded-full">
                {initialsFromTitle(channelTitle)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 className="text-lg font-semibold leading-snug text-foreground truncate">
                {channelTitle}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Curator&apos;s note</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 max-h-[min(40vh,320px)] overflow-y-auto text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {note}
        </div>

        <div className="border-t border-border bg-background px-3 py-5 sm:px-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Community ratings
          </h3>

          <ChannelReviewRatingSummary
            variant="modal"
            reviewStats={reviewStats}
            isReviewStatsLoading={isReviewStatsLoading}
            channelRating={channelRating}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
