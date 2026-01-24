import { Metadata } from "next";
import { CommentQuestionsPageClient } from "@/components/youtube/comment-questions-page-client";

export const metadata: Metadata = {
  title: "Comment Questions | YouTube Tools | what2watch",
  description: "Extract and analyze questions from video comments to discover content opportunities and identify what viewers want to know.",
};

export default function CommentQuestionsPage() {
  return <CommentQuestionsPageClient />;
}
