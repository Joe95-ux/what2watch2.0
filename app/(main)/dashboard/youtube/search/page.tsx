import type { Metadata } from "next";
import { YouTubeSearch } from "@/components/youtube/youtube-search";

export const metadata: Metadata = {
  title: "Search YouTube videos | what2watch dashboard",
  description:
    "Search YouTube from your dashboard: find videos and channels faster, then save to playlists or your feed. Built for discovery without leaving what2watch.",
  robots: { index: false, follow: true },
};

export default function YouTubeSearchPage() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Search YouTube</h1>
        <p className="text-muted-foreground">
          Search for videos across YouTube
        </p>
      </div>
      <YouTubeSearch />
    </div>
  );
}

