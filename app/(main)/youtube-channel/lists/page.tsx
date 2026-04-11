import type { Metadata } from "next";
import { ChannelListsExplorer } from "@/components/youtube/channel-lists/channel-lists-explorer";

export const metadata: Metadata = {
  title: "YouTube channel lists — curated creator collections | what2watch",
  description:
    "Browse public YouTube channel lists built by the community. Discover themed creator roundups, follow lists you love, and publish your own curated picks to help others find great channels.",
  keywords: [
    "YouTube channel lists",
    "curated YouTube channels",
    "YouTube creator lists",
    "follow channel lists",
    "what2watch",
  ],
  openGraph: {
    title: "YouTube channel lists | what2watch",
    description:
      "Explore and follow curated YouTube channel collections. Find lists by topic and share your own.",
  },
};

export default function YouTubeChannelListsPage() {
  return <ChannelListsExplorer />;
}
