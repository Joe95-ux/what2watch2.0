import { Suspense } from "react";
import { ForumAdminContent } from "@/components/admin/forum/forum-admin-content";
import { Skeleton } from "@/components/ui/skeleton";

function ForumAdminFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ForumAdminPage() {
  return (
    <Suspense fallback={<ForumAdminFallback />}>
      <ForumAdminContent />
    </Suspense>
  );
}

