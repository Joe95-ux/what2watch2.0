import { Metadata } from "next";
import { YouTubeAnalyzerPageClient } from "@/components/youtube/youtube-analyzer-page-client";

export const metadata: Metadata = {
  title: "Title & Thumbnail Analyzer | YouTube Tools | what2watch",
  description: "Analyze top-performing YouTube video titles and thumbnails. Discover patterns that drive views and engagement.",
};

export default function YouTubeAnalyzerPage() {
  return <YouTubeAnalyzerPageClient />;
}
