import { Suspense } from "react";
import { ForumBookmarksPageClient } from "@/components/forum/forum-bookmarks-page-client";

// Force dynamic rendering
export const dynamic = "force-dynamic";

function ForumSavedPostsPageFallback() {
  return null;
}

export default function ForumSavedPostsPage() {
  return (
    <Suspense fallback={<ForumSavedPostsPageFallback />}>
      <ForumBookmarksPageClient />
    </Suspense>
  );
}

