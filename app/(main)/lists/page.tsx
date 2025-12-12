import { Suspense } from "react";
import { ListsPageClient } from "@/components/lists/lists-page-client";

function ListsPageFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-[65px] z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide">
            {/* Main tabs skeleton */}
            <div className="relative py-4 flex items-center gap-2">
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            </div>
            <div className="relative py-4 flex items-center gap-2">
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              <div className="h-4 w-28 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Sub-tabs skeleton */}
          <div className="border-b border-border">
            <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
              <div className="relative py-3 flex items-center gap-2">
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-12 bg-muted animate-pulse rounded" />
              </div>
              <div className="relative py-3 flex items-center gap-2">
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </div>
              <div className="relative py-3 flex items-center gap-2">
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </div>
              <div className="relative py-3 flex items-center gap-2">
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-14 bg-muted animate-pulse rounded" />
              </div>
              <div className="relative py-3 flex items-center gap-2">
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ListsPage() {
  return (
    <Suspense fallback={<ListsPageFallback />}>
      <ListsPageClient />
    </Suspense>
  );
}

