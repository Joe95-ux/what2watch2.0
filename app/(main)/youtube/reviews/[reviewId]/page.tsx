import type { Metadata } from "next";
import { YouTubeReviewDetailClient } from "@/components/youtube/youtube-review-detail-client";
import { db } from "@/lib/db";

interface PageProps {
  params: Promise<{ reviewId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { reviewId } = await params;

  const review = await db.channelReview.findUnique({
    where: { id: reviewId },
    select: {
      title: true,
      content: true,
      rating: true,
      status: true,
      channelId: true,
    },
  });

  if (!review || review.status !== "published") {
    return {
      title: "Channel review | what2watch",
      description:
        "Read community YouTube channel reviews and ratings on what2watch—find honest takes before you subscribe.",
    };
  }

  const channel = await db.youTubeChannel.findUnique({
    where: { channelId: review.channelId },
    select: { title: true, thumbnail: true },
  });

  const channelTitle = channel?.title || "YouTube channel";
  const headline =
    review.title?.trim() || `${review.rating}-star channel review`;
  const snippet =
    review.content.length > 155
      ? `${review.content.slice(0, 152)}…`
      : review.content;

  const description = `Community review of ${channelTitle} (${review.rating}/5). ${snippet}`;

  const metaTitle =
    `${headline} · ${channelTitle}`.length > 58
      ? `YouTube review: ${channelTitle} (${review.rating}/5) | what2watch`
      : `${headline} · ${channelTitle} | what2watch`;

  return {
    title: metaTitle,
    description,
    keywords: [
      "YouTube channel review",
      channelTitle,
      "community reviews",
      "YouTube ratings",
      "what2watch",
    ],
    openGraph: {
      title: `${headline} · ${channelTitle}`,
      description: snippet,
      images: channel?.thumbnail ? [channel.thumbnail] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${headline} · ${channelTitle}`,
      description: snippet,
      images: channel?.thumbnail ? [channel.thumbnail] : undefined,
    },
  };
}

export default async function YouTubeReviewDetailPage({ params }: PageProps) {
  const { reviewId } = await params;
  return <YouTubeReviewDetailClient reviewId={reviewId} />;
}


