import type { Metadata } from "next";
import { YouTubePageClient } from "@/components/youtube/youtube-page-client";

// Force dynamic rendering since this page uses useSearchParams() for tab navigation
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "YouTube discovery — channels, lists & community reviews | what2watch",
  description:
    "Explore YouTube channels, curated channel lists, recent community reviews, and a reviewer leaderboard—all in one place. Find creators to watch, save themed lists, and read honest channel reviews on what2watch.",
  keywords: [
    "YouTube channels",
    "YouTube channel lists",
    "YouTube channel reviews",
    "find YouTube creators",
    "curated YouTube lists",
    "what2watch",
  ],
  openGraph: {
    title: "YouTube discovery — channels, lists & reviews | what2watch",
    description:
      "Browse channels, curated lists, and community reviews. Discover creators and lists worth following.",
  },
};

export default function YouTubePage() {
  return <YouTubePageClient />;
}

