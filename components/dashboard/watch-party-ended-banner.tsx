"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type WatchPartyEndedBannerProps = {
  title: string;
  onDismiss: () => void;
};

export function WatchPartyEndedBanner({ title, onDismiss }: WatchPartyEndedBannerProps) {
  return (
    <div
      role="status"
      className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-3 sm:px-4"
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">This watch party has ended</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The party for <span className="font-medium text-foreground">{title}</span> is no longer
          active. Ask the host for a new invite link to join again.
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 cursor-pointer rounded-full"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
