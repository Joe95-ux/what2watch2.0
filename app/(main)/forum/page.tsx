import { Suspense } from "react";
import { ForumPageClient } from "@/components/forum/forum-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";

function ForumPageFallback() {
  // Minimal fallback - let client components handle their own loading states
  return null;
}

export default function ForumPage() {
  return (
    <Suspense fallback={<ForumPageFallback />}>
      <ForumPageClient />
    </Suspense>
  );
}

