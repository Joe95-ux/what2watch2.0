import type { Metadata } from "next";
import { YouTubeAnalyticsDashboard } from "@/components/youtube/youtube-analytics-dashboard";

export const metadata: Metadata = {
  title: "YouTube viewing analytics | what2watch dashboard",
  description:
    "See how you engage with YouTube on what2watch: watch patterns and activity insights to understand your viewing habits—not third-party channel analytics.",
  robots: { index: false, follow: true },
};

export default function YouTubeAnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <YouTubeAnalyticsDashboard />
    </div>
  );
}

