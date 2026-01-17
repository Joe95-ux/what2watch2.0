import { Metadata } from "next";
import { ChannelDiagnosticPageClient } from "@/components/youtube/channel-diagnostic-page-client";

export const metadata: Metadata = {
  title: "Channel Diagnostic Tool | YouTube Tools | what2watch",
  description: "Analyze competitor channels to discover success patterns, upload consistency, and engagement strategies.",
};

export default function ChannelDiagnosticPage() {
  return <ChannelDiagnosticPageClient />;
}
