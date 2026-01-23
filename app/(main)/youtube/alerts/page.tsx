import { Metadata } from "next";
import { TrendAlertsPageClient } from "@/components/youtube/trend-alerts-page-client";

export const metadata: Metadata = {
  title: "Trend Alerts | YouTube Tools | what2watch",
  description: "Set up alerts for trending opportunities in your niche and get notified when keywords match your criteria.",
};

export default function TrendAlertsPage() {
  return <TrendAlertsPageClient />;
}
