import { Suspense } from "react";
import { ForumFilterContent } from "@/components/forum/forum-filter-content";
import { Skeleton } from "@/components/ui/skeleton";

function ForumFilterFallback() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar skeleton */}
      <div className="hidden md:block w-64 border-r border-border bg-background flex-shrink-0">
        <div className="flex flex-col h-full">
          {/* Collapse button skeleton */}
          <div className="p-2 border-b flex justify-end">
            <Skeleton className="h-8 w-8" />
          </div>
          <div className="flex-1 overflow-hidden">
            {/* Navigation links skeleton */}
            <div className="p-4 border-b space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
            {/* Categories skeleton */}
            <div className="p-4 border-b">
              <Skeleton className="h-4 w-20 mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            </div>
            {/* Trending skeleton */}
            <div className="p-4">
              <Skeleton className="h-4 w-16 mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-24" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content skeleton */}
      <div className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForumFilterPage() {
  return (
    <Suspense fallback={<ForumFilterFallback />}>
      <ForumFilterContent />
    </Suspense>
  );
}

