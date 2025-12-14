import { Suspense } from "react";
import { ForumPostDetailClient } from "@/components/forum/forum-post-detail-client";
import { Skeleton } from "@/components/ui/skeleton";

function ForumPostDetailFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForumPostDetailPage() {
  return (
    <Suspense fallback={<ForumPostDetailFallback />}>
      <ForumPostDetailClient />
    </Suspense>
  );
}

