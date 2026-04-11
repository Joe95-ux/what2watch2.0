import type { Metadata } from "next";
import YouTubeDashboardContent from "@/components/youtube/youtube-dashboard-content";

export const metadata: Metadata = {
  title: "YouTube dashboard — feed, favorites & playlists | what2watch",
  description:
    "Your home for YouTube on what2watch: manage channels in your feed, favorites, playlists, and video tools—so you spend less time searching and more time watching.",
  robots: { index: false, follow: true },
};

export default function DashboardYouTubePage() {
  return <YouTubeDashboardContent />;
}
