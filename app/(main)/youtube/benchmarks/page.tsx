import { Metadata } from "next";
import { PerformanceBenchmarksPageClient } from "@/components/youtube/performance-benchmarks-page-client";

export const metadata: Metadata = {
  title: "Performance Benchmarking | YouTube Tools | what2watch",
  description: "Compare your channel's performance against industry benchmarks and see how you rank against competitors.",
};

export default function PerformanceBenchmarksPage() {
  return <PerformanceBenchmarksPageClient />;
}
