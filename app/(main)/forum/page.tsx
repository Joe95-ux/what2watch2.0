import { Suspense } from "react";
import { ForumPageClient } from "@/components/forum/forum-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";

function ForumPageFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
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

