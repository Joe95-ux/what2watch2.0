import { Metadata } from "next";
import { FormatInspirationPageClient } from "@/components/youtube/format-inspiration-page-client";

export const metadata: Metadata = {
  title: "YouTube format inspiration — video ideas by topic | what2watch",
  description:
    "Find video formats that resonate for your niche: tutorials, reactions, shorts-style hooks, and more. Get structured inspiration for your next upload—not generic prompts—on what2watch.",
  keywords: [
    "YouTube video formats",
    "content format ideas",
    "YouTube video ideas",
    "creator inspiration",
    "what2watch",
  ],
  openGraph: {
    title: "YouTube format inspiration | what2watch",
    description: "Match proven formats to your topic so you ship videos viewers actually want.",
  },
};

export default function FormatInspirationPage() {
  return <FormatInspirationPageClient />;
}
