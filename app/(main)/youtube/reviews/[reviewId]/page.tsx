import { YouTubeReviewDetailClient } from "@/components/youtube/youtube-review-detail-client";

interface PageProps {
  params: Promise<{ reviewId: string }>;
}

export default async function YouTubeReviewDetailPage({ params }: PageProps) {
  const { reviewId } = await params;
  return <YouTubeReviewDetailClient reviewId={reviewId} />;
}

