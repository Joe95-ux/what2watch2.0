import { Suspense } from "react";
import { PopularPostsPageClient } from "@/components/forum/popular-posts-page-client";

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

