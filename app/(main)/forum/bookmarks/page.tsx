import { Suspense } from "react";
import { ForumBookmarksPageClient } from "@/components/forum/forum-bookmarks-page-client";

// Force dynamic rendering
export const dynamic = "force-dynamic";

function ForumBookmarksPageFallback() {
  return null;
}

export default function ForumBookmarksPage() {
  return (
    <Suspense fallback={<ForumBookmarksPageFallback />}>
      <ForumBookmarksPageClient />
    </Suspense>
  );
}

