"use client";

import { cn } from "@/lib/utils";

/** Centered three-dot pulse for sheet / modal loading states */
export function SheetLoadingDots({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 min-h-[14rem] w-full",
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <div className="flex items-end justify-center gap-1.5 h-6">
        <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" />
      </div>
    </div>
  );
}
