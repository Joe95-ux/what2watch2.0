import { Metadata } from "next";
import { PerformanceBenchmarksPageClient } from "@/components/youtube/performance-benchmarks-page-client";

export const metadata: Metadata = {
  title: "YouTube performance benchmarks — compare your channel | what2watch",
  description:
    "Benchmark your YouTube channel against peers: see how views, engagement, and upload cadence stack up. Spot gaps, set goals, and prioritize what to improve—free tools on what2watch.",
  keywords: [
    "YouTube benchmarks",
    "channel performance comparison",
    "YouTube analytics tools",
    "creator growth",
    "what2watch",
  ],
  openGraph: {
    title: "YouTube performance benchmarks | what2watch",
    description:
      "Compare your channel to similar creators and uncover opportunities to grow faster.",
  },
};

export default function PerformanceBenchmarksPage() {
  return <PerformanceBenchmarksPageClient />;
}
