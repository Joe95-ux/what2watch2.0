"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WatchToggleButtonProps {
  isWatched: boolean;
  isMobile: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}

/** Eye + label in one control; mobile uses shorter “Mark as seen” copy. */
export function WatchToggleButton({
  isWatched,
  isMobile,
  onClick,
  className,
}: WatchToggleButtonProps) {
  const label = isWatched
    ? "Watched"
    : isMobile
      ? "Mark as seen"
      : "Mark as watched";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-pressed={isWatched}
      aria-label={label}
      className={cn(
        "h-auto min-h-8 py-1 px-2 gap-1.5 shrink-0 cursor-pointer whitespace-nowrap text-sm font-normal text-muted-foreground hover:text-muted-foreground",
        className
      )}
      onClick={onClick}
    >
      <Eye
        className={cn(
          "h-4 w-4 shrink-0",
          isWatched ? "text-green-500" : "text-muted-foreground"
        )}
        aria-hidden
      />
      <span>{label}</span>
    </Button>
  );
}
