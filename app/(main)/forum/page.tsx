import { Suspense } from "react";
import { ForumPageClient } from "@/components/forum/forum-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";

function ForumPageFallback() {
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
          {/* Two Column Layout Skeleton */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content Column */}
            <div className="flex-1 min-w-0">
              {/* Header skeleton */}
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
              
              {/* Posts skeleton */}
              <div className="space-y-0">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-3" />
                    <Skeleton className="h-9 w-full rounded-[25px]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Sidebar Skeleton */}
            <aside className="w-full lg:w-80 flex-shrink-0">
              <div className="sticky top-24">
                <div className="rounded-lg border border-border bg-background">
                  <div className="p-4 border-b">
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="divide-y divide-border">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="p-4 space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForumPage() {
  return (
    <Suspense fallback={<ForumPageFallback />}>
      <ForumPageClient />
    </Suspense>
  );
}

