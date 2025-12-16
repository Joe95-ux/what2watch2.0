import { Suspense } from "react";
import { PopularPostsPageClient } from "@/components/forum/popular-posts-page-client";

// Force dynamic rendering since this page uses useSearchParams() in ForumPostList
export const dynamic = "force-dynamic";

function PopularPostsPageFallback() {
  return null;
}

export default function PopularPostsPage() {
  return (
    <Suspense fallback={<PopularPostsPageFallback />}>
      <PopularPostsPageClient />
    </Suspense>
  );
}

