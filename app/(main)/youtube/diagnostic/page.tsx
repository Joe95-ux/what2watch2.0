import { Metadata } from "next";
import { ChannelDiagnosticPageClient } from "@/components/youtube/channel-diagnostic-page-client";

export const metadata: Metadata = {
  title: "YouTube channel diagnostic — competitor & growth signals | what2watch",
  description:
    "Audit any public YouTube channel: upload rhythm, topical focus, and engagement signals side by side. Steal the playbook—not the content—and adapt what works for your channel.",
  keywords: [
    "YouTube channel analysis",
    "competitor channel research",
    "YouTube growth signals",
    "what2watch",
  ],
  openGraph: {
    title: "YouTube channel diagnostic | what2watch",
    description: "Compare channels to uncover repeatable patterns behind growth in your niche.",
  },
};

export default function ChannelDiagnosticPage() {
  return <ChannelDiagnosticPageClient />;
}
