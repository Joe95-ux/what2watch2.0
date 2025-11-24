import type { Metadata } from "next";
import { notFound } from "next/navigation";
import YouTubeChannelPageClient from "@/components/youtube/youtube-channel-page-client";
import { db } from "@/lib/db";

async function resolveChannelIdentifier(param: string) {
  if (!param) return null;

  if (param.startsWith("@")) {
    return db.youTubeChannel.findUnique({
      where: { slug: param },
      select: { channelId: true, title: true, slug: true },
    });
  }

  return db.youTubeChannel.findUnique({
    where: { channelId: param },
    select: { channelId: true, title: true, slug: true },
  });
}

async function fetchChannelMetadata(channelId: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const response = await fetch(`${baseUrl}/api/youtube/channels/${channelId}`, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ channelId: string }>;
}): Promise<Metadata> {
  const { channelId: slugOrId } = await params;
  const record = await resolveChannelIdentifier(slugOrId);

  if (!record) {
    return {
      title: "Channel Not Found | what2watch",
      description: "Discover Nollywood content creators on what2watch.",
    };
  }

  const data = await fetchChannelMetadata(record.channelId);
  const channel = data?.channel;

  const title = channel?.title || record.title || "YouTube Channel";
  const description =
    channel?.description?.slice(0, 160) ||
    `Explore the latest Nollywood content from ${title} on what2watch.`;

  return {
    title: `${title} | what2watch`,
    description,
    openGraph: {
      title: `${title} | what2watch`,
      description,
      images: channel?.thumbnail ? [channel.thumbnail] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | what2watch`,
      description,
      images: channel?.thumbnail ? [channel.thumbnail] : undefined,
    },
  };
}

export default async function YouTubeChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId: slugOrId } = await params;
  const record = await resolveChannelIdentifier(slugOrId);

  if (!record) {
    notFound();
  }

  return <YouTubeChannelPageClient channelId={record.channelId} />;
}

