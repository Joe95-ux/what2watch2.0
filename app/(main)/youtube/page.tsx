import { YouTubePageClient } from "@/components/youtube/youtube-page-client";

// Force dynamic rendering since this page uses useSearchParams() for tab navigation
export const dynamic = "force-dynamic";

export default function YouTubePage() {
  return <YouTubePageClient />;
}

