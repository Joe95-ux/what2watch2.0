import { Metadata } from "next";
import { ContentGapsPageClient } from "@/components/youtube/content-gaps-page-client";

export const metadata: Metadata = {
  title: "YouTube content gap finder — demand vs competition | what2watch",
  description:
    "Find YouTube topics with strong viewer demand and lighter competition: the sweet spot for new videos, series, and playlists. Prioritize ideas worth your production time on what2watch.",
  keywords: [
    "YouTube content gaps",
    "low competition topics",
    "YouTube niche ideas",
    "content opportunity finder",
    "what2watch",
  ],
  openGraph: {
    title: "YouTube content gap finder | what2watch",
    description: "Spot underserved topics before they’re saturated—then own the conversation.",
  },
};

export default function ContentGapsPage() {
  return <ContentGapsPageClient />;
}
