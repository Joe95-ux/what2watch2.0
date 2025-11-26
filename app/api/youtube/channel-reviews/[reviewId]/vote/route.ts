import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { evaluateReviewerBadges } from "@/lib/youtube-review-badges";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { reviewId } = await params;
    const review = await db.channelReview.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true, helpfulCount: true },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.userId === user.id) {
      return NextResponse.json(
        { error: "You cannot vote on your own review" },
        { status: 400 }
      );
    }

    const existingVote = await db.channelReviewVote.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId: user.id,
        },
      },
    });

    if (existingVote) {
      await db.$transaction([
        db.channelReviewVote.delete({
          where: { id: existingVote.id },
        }),
        db.channelReview.update({
          where: { id: reviewId },
          data: {
            helpfulCount: Math.max(0, review.helpfulCount - 1),
          },
        }),
      ]);

      await evaluateReviewerBadges(review.userId);
      return NextResponse.json({ added: false });
    }

    await db.$transaction([
      db.channelReviewVote.create({
        data: {
          reviewId,
          userId: user.id,
        },
      }),
      db.channelReview.update({
        where: { id: reviewId },
        data: {
          helpfulCount: review.helpfulCount + 1,
        },
      }),
    ]);

    await evaluateReviewerBadges(review.userId);
    return NextResponse.json({ added: true });
  } catch (error) {
    console.error("[ChannelReviews] vote toggle error", error);
    return NextResponse.json({ error: "Failed to update vote" }, { status: 500 });
  }
}


