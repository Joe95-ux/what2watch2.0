import { Metadata } from "next";
import { YouTubeInsightsPageClient } from "@/components/youtube/youtube-insights-page-client";

export const metadata: Metadata = {
  title: "YouTube content insights — performance & opportunities | what2watch",
  description:
    "Turn your catalog into answers: which topics, lengths, and formats perform best? Data-driven YouTube content insights to double down on what works and cut what doesn’t.",
  keywords: [
    "YouTube content insights",
    "video performance analysis",
    "creator analytics",
    "what2watch",
  ],
  openGraph: {
    title: "YouTube content insights | what2watch",
    description: "See patterns across your videos so you can plan smarter uploads.",
  },
};

export default function YouTubeInsightsPage() {
  return <YouTubeInsightsPageClient />;
}
