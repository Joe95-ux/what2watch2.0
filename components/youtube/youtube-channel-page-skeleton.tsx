"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { YouTubeChannelSidebar } from "@/components/youtube/youtube-channel-sidebar";

export default function YouTubeChannelPageSkeleton() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Always visible, shows its own loading state */}
      <YouTubeChannelSidebar 
        currentChannelId={undefined}
        activeTab="channel"
        onTabChange={() => {}}
      />

      {/* Main Content Skeleton */}
      <div className="flex-1 min-w-0 lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Banner Skeleton */}
          <div>
            <Skeleton className="h-32 w-full rounded-lg sm:h-[206px]" />
          </div>

          {/* Channel info — matches mobile (below banner) + desktop layouts */}
          <div className="mb-8 mt-5 sm:mt-8">
            <div className="flex items-start gap-3 sm:items-center sm:gap-6">
              <Skeleton className="h-16 w-16 shrink-0 rounded-full sm:h-40 sm:w-40" />
              <div className="min-w-0 flex-1 space-y-2.5 sm:space-y-3">
                <Skeleton className="h-6 max-w-[min(100%,16rem)] rounded-md sm:h-8 sm:max-w-sm" />
                <Skeleton className="h-3.5 w-36 rounded-md sm:h-4 sm:w-48" />
                {/* Description lines — desktop in-column; mobile mimics short bio under title */}
                <div className="hidden space-y-2 sm:block">
                  <Skeleton className="h-4 w-full max-w-md rounded-md" />
                  <Skeleton className="h-4 w-[92%] max-w-md rounded-md" />
                </div>
                <div className="space-y-2 sm:hidden">
                  <Skeleton className="h-3.5 w-full rounded-md" />
                  <Skeleton className="h-3.5 w-[90%] rounded-md" />
                </div>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <Skeleton className="h-9 w-[5.75rem] rounded-full" />
                  <Skeleton className="h-9 w-[7.75rem] rounded-full" />
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
    </div>
  );
}

