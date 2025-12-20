import { Suspense } from "react";
import { ForumBadgesContent } from "@/components/forum/forum-badges-content";

export default function ForumBadgesPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        <ForumBadgesContent />
      </Suspense>
    </div>
  );
}

