import { Suspense } from "react";
import { PersonalizedPageClient } from "@/components/browse/personalized-page-client";
import { Skeleton } from "@/components/ui/skeleton";

// Force dynamic rendering since this page uses useSearchParams()
export const dynamic = "force-dynamic";

export default function PersonalizedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(20)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    }>
      <PersonalizedPageClient />
    </Suspense>
  );
}

