import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

async function resolveCurrentUserId() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;
    const currentUserId = await resolveCurrentUserId();

    const review = await db.channelReview.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!review || review.status !== "published") {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Get channel info
    const channel = await db.youTubeChannel.findUnique({
      where: { channelId: review.channelId },
      select: {
        title: true,
        thumbnail: true,
        slug: true,
      },
    });

    // Check if user has voted
    let viewerHasVoted = false;
    if (currentUserId) {
      const vote = await db.channelReviewVote.findFirst({
        where: {
          userId: currentUserId,
          reviewId: review.id,
        },
      });
      viewerHasVoted = Boolean(vote);
    }

    return NextResponse.json({
      id: review.id,
      channelId: review.channelId,
      channelTitle: channel?.title || null,
      channelThumbnail: channel?.thumbnail || null,
      channelSlug: channel?.slug || null,
      rating: review.rating,
      title: review.title,
      content: review.content,
      tags: review.tags,
      helpfulCount: review.helpfulCount,
      isEdited: review.isEdited,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      userId: review.userId,
      user: review.user,
      viewerHasVoted,
      canEdit: currentUserId === review.userId,
    });
  } catch (error) {
    console.error("[ChannelReviewDetail] GET error", error);
    return NextResponse.json({ error: "Failed to fetch review" }, { status: 500 });
  }
}
