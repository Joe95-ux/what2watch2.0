import { Metadata } from "next";
import { YouTubeInsightsPageClient } from "@/components/youtube/youtube-insights-page-client";

export const metadata: Metadata = {
  title: "Content Insights | YouTube Tools | what2watch",
  description: "Get data-driven insights about YouTube content performance, trends, and opportunities.",
};

export default function YouTubeInsightsPage() {
  return <YouTubeInsightsPageClient />;
}
