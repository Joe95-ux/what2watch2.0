import { Metadata } from "next";
import { YouTubeAnalyzerPageClient } from "@/components/youtube/youtube-analyzer-page-client";

export const metadata: Metadata = {
  title: "YouTube title & thumbnail analyzer — CTR patterns | what2watch",
  description:
    "Study winning YouTube titles and thumbnails: spot hooks, formats, and patterns that correlate with views and engagement. Improve click-through before you publish—on what2watch.",
  keywords: [
    "YouTube title analyzer",
    "YouTube thumbnail analysis",
    "CTR tips YouTube",
    "video packaging",
    "what2watch",
  ],
  openGraph: {
    title: "YouTube title & thumbnail analyzer | what2watch",
    description: "Break down what strong titles and thumbnails have in common for your niche.",
  },
};

export default function YouTubeAnalyzerPage() {
  return <YouTubeAnalyzerPageClient />;
}
