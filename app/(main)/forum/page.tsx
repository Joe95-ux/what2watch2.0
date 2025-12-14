import { Suspense } from "react";
import { ForumPageClient } from "@/components/forum/forum-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";

function ForumPageFallback() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar skeleton */}
      <div className="hidden md:block w-64 border-r border-border bg-background flex-shrink-0">
        <div className="p-4 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      
      {/* Main content skeleton */}
      <div className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
          
          {/* Posts skeleton - Reddit style */}
          <div className="space-y-0 border border-border rounded-lg overflow-hidden">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex gap-2 p-3 border-b border-border/50 last:border-b-0">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
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

