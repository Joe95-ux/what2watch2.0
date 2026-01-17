import { Metadata } from "next";
import { YouTubeTrendsPageClient } from "@/components/youtube/youtube-trends-page-client";

export const metadata: Metadata = {
  title: "Trending Topics | YouTube Tools | what2watch",
  description: "Discover trending topics and keywords on YouTube. Track momentum and find content opportunities.",
};

export default function YouTubeTrendsPage() {
  return <YouTubeTrendsPageClient />;
}
