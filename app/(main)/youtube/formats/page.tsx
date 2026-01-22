import { Metadata } from "next";
import { FormatInspirationPageClient } from "@/components/youtube/format-inspiration-page-client";

export const metadata: Metadata = {
  title: "Format Inspiration Engine | YouTube Tools | what2watch",
  description: "Discover which video formats perform best for your topic and get inspiration for your next video.",
};

export default function FormatInspirationPage() {
  return <FormatInspirationPageClient />;
}
