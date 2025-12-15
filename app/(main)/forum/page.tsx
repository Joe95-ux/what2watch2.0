import { ForumPageClient } from "@/components/forum/forum-page-client";

// Force dynamic rendering since this page uses useSearchParams() for filtering
export const dynamic = "force-dynamic";

export default function ForumPage() {
  return <ForumPageClient />;
}

