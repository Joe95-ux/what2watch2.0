"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function YouTubeChannelCardSkeleton() {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs mb-3">
        <Skeleton className="h-5 w-16 rounded" />
        <Skeleton className="h-5 w-16 rounded" />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Skeleton className="h-5 w-9 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <Skeleton className="h-5 w-9 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

