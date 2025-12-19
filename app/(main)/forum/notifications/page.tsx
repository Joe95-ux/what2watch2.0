import { Suspense } from "react";
import { ForumNotificationsPageClient } from "@/components/forum/forum-notifications-page-client";

// Force dynamic rendering since this page uses useSearchParams() in child components
export const dynamic = "force-dynamic";

function ForumNotificationsPageFallback() {
  return null;
}

export default function ForumNotificationsPage() {
  return (
    <Suspense fallback={<ForumNotificationsPageFallback />}>
      <ForumNotificationsPageClient />
    </Suspense>
  );
}

