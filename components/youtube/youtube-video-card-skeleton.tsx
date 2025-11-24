"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function YouTubeVideoCardSkeleton() {
  return (
    <div className="bg-card rounded-lg overflow-hidden">
      {/* Thumbnail */}
      <Skeleton className="aspect-video w-full" />
      
      {/* Content */}
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

