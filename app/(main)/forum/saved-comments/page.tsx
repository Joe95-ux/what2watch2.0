import { Suspense } from "react";
import { ForumSavedCommentsPageClient } from "@/components/forum/forum-saved-comments-page-client";

// Force dynamic rendering
export const dynamic = "force-dynamic";

function ForumSavedCommentsPageFallback() {
  return null;
}

export default function ForumSavedCommentsPage() {
  return (
    <Suspense fallback={<ForumSavedCommentsPageFallback />}>
      <ForumSavedCommentsPageClient />
    </Suspense>
  );
}

