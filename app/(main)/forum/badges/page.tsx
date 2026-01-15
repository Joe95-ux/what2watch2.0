import { Suspense } from "react";
import { ForumBadgesContent } from "@/components/forum/forum-badges-content";

// Force dynamic rendering since forum layout uses useSearchParams()
export const dynamic = "force-dynamic";

export default function ForumBadgesPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        <ForumBadgesContent />
      </Suspense>
    </div>
  );
}

