import { Suspense } from "react";
import { ForumPostDetailClient } from "@/components/forum/forum-post-detail-client";
import { Skeleton } from "@/components/ui/skeleton";

// Force dynamic rendering since forum layout uses useSearchParams()
export const dynamic = "force-dynamic";

function ForumPostDetailFallback() {
  // Minimal fallback - let client components handle their own loading states
  return null;
}

export default function ForumPostDetailPage() {
  return (
    <Suspense fallback={<ForumPostDetailFallback />}>
      <ForumPostDetailClient />
    </Suspense>
  );
}

