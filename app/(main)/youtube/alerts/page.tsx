import { Metadata } from "next";
import { TrendAlertsPageClient } from "@/components/youtube/trend-alerts-page-client";

export const metadata: Metadata = {
  title: "YouTube trend alerts — keyword & niche monitoring | what2watch",
  description:
    "Never miss a spike in your niche: set keyword-based trend alerts for YouTube so you can react while topics are hot—ideal for timely shorts, breakdowns, and commentary.",
  keywords: [
    "YouTube trend alerts",
    "keyword monitoring YouTube",
    "niche trend tracking",
    "creator alerts",
    "what2watch",
  ],
  openGraph: {
    title: "YouTube trend alerts | what2watch",
    description: "Get notified when your saved keywords heat up so you can publish while interest peaks.",
  },
};

export default function TrendAlertsPage() {
  return <TrendAlertsPageClient />;
}
