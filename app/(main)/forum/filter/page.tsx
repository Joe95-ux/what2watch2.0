import { Suspense } from "react";
import { ForumFilterContent } from "@/components/forum/forum-filter-content";
import { Skeleton } from "@/components/ui/skeleton";

function ForumFilterFallback() {
  // Minimal fallback - let client components handle their own loading states
  return null;
}

export default function ForumFilterPage() {
  return (
    <Suspense fallback={<ForumFilterFallback />}>
      <ForumFilterContent />
    </Suspense>
  );
}

