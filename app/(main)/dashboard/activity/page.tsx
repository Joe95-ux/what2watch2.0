import { Suspense } from "react";
import ActivityContent from "@/components/dashboard/activity-content";
import { Skeleton } from "@/components/ui/skeleton";

// Force dynamic rendering since this page uses useSearchParams()
export const dynamic = "force-dynamic";

export default function ActivityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    }>
      <ActivityContent />
    </Suspense>
  );
}

