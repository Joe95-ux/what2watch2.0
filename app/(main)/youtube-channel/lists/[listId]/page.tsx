import type { Metadata } from "next";
import { ChannelListDetail } from "@/components/youtube/channel-lists/channel-list-detail";
import { db } from "@/lib/db";

interface PageProps {
  params: Promise<{ listId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { listId } = await params;

  const list = await db.youTubeChannelList.findUnique({
    where: { id: listId },
    include: { _count: { select: { items: true } } },
  });

  if (!list) {
    return {
      title: "Channel list not found | what2watch",
      description: "This YouTube channel list is unavailable or was removed.",
    };
  }

  const itemCount = list._count.items;
  const raw = list.description?.trim();
  const description =
    raw && raw.length > 0
      ? raw.length > 160
        ? `${raw.slice(0, 157)}…`
        : raw
      : `Curated YouTube channel list with ${itemCount} channel${itemCount === 1 ? "" : "s"}. Discover creators, follow the list, and explore picks on what2watch.`;

  const baseTitle = `${list.name} | YouTube channel list | what2watch`;

  return {
    title: baseTitle,
    description,
    keywords: [
      "YouTube channel list",
      "curated YouTube channels",
      ...list.tags.slice(0, 8),
      "what2watch",
    ],
    robots: list.isPublic
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: `${list.name} | what2watch`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${list.name} | what2watch`,
      description,
    },
  };
}

export default async function YouTubeChannelListDetailPage({
  params,
}: PageProps) {
  const { listId } = await params;
  return <ChannelListDetail listId={listId} />;
}


