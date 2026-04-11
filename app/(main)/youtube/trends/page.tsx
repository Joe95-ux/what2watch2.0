import { Metadata } from "next";
import { YouTubeTrendsPageClient } from "@/components/youtube/youtube-trends-page-client";

export const metadata: Metadata = {
  title: "YouTube trending topics & keyword momentum | what2watch",
  description:
    "Track what is heating up on YouTube: trending topics, keyword momentum, and timely angles for your next video. Turn signals into content ideas with what2watch trend tools.",
  keywords: [
    "YouTube trending topics",
    "YouTube keyword trends",
    "content ideas YouTube",
    "what to make on YouTube",
    "what2watch",
  ],
  openGraph: {
    title: "YouTube trending topics | what2watch",
    description: "Find momentum behind topics and keywords so you can plan timely, relevant videos.",
  },
};

export default function YouTubeTrendsPage() {
  return <YouTubeTrendsPageClient />;
}
