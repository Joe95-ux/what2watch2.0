import { YouTubeAnalyticsDashboard } from "@/components/youtube/youtube-analytics-dashboard";

export const metadata = {
  title: "YouTube Analytics | what2watch",
  description: "View your YouTube viewing analytics and engagement metrics",
};

export default function YouTubeAnalyticsPage() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <YouTubeAnalyticsDashboard />
    </div>
  );
}

