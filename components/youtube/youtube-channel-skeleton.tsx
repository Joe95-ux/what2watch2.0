"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function YouTubeChannelSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Banner Skeleton */}
      <div className="w-full h-[200px] sm:h-[250px] md:h-[300px] bg-muted">
        <Skeleton className="w-full h-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Channel Info Skeleton */}
        <div className="relative -mt-16 sm:-mt-20 md:-mt-24 mb-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
            {/* Avatar Skeleton */}
            <Skeleton className="w-32 h-32 sm:w-40 sm:h-40 rounded-full flex-shrink-0" />
            
            {/* Info Skeleton */}
            <div className="flex-1 min-w-0 pb-4">
              <Skeleton className="h-8 w-64 mb-3" />
              <Skeleton className="h-4 w-48 mb-4" />
              <Skeleton className="h-4 w-full max-w-md mb-2" />
              <Skeleton className="h-4 w-3/4 max-w-md mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-28" />
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Nav Skeleton */}
        <div className="mb-8">
          <div className="flex gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-20" />
            ))}
          </div>
        </div>

        {/* Videos Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-video rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

