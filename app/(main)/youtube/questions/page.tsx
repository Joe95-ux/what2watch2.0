import { Metadata } from "next";
import { CommentQuestionsPageClient } from "@/components/youtube/comment-questions-page-client";

export const metadata: Metadata = {
  title: "YouTube comment questions — mine FAQs for video ideas | what2watch",
  description:
    "Pull real questions from YouTube comments to fuel your content calendar. See what viewers ask, prioritize topics with demand, and answer them in your next videos—what2watch.",
  keywords: [
    "YouTube comment analysis",
    "video ideas from comments",
    "audience questions",
    "FAQ content ideas",
    "what2watch",
  ],
  openGraph: {
    title: "Mine YouTube comments for questions | what2watch",
    description: "Turn comment-section questions into your next high-intent video topics.",
  },
};

export default function CommentQuestionsPage() {
  return <CommentQuestionsPageClient />;
}
