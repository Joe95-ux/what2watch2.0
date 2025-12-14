import { Suspense } from "react";
import { ForumFilterContent } from "@/components/forum/forum-filter-content";
import { Skeleton } from "@/components/ui/skeleton";

function ForumFilterFallback() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar skeleton */}
      <div className="hidden md:block w-64 border-r border-border bg-background flex-shrink-0">
        <div className="p-4 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
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

