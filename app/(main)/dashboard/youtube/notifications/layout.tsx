import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "YouTube notifications | what2watch dashboard",
  description:
    "Stay on top of YouTube updates from what2watch: channel activity, list follows, and alerts—manage read state and preferences in one place.",
  robots: { index: false, follow: true },
};

export default function YouTubeNotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
