import { Metadata } from "next";
import { ContentGapsPageClient } from "@/components/youtube/content-gaps-page-client";

export const metadata: Metadata = {
  title: "Content Gap Finder | YouTube Tools | what2watch",
  description: "Discover high-demand topics with low competition. Find content opportunities that are trending but underserved.",
};

export default function ContentGapsPage() {
  return <ContentGapsPageClient />;
}
