import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { evaluateReviewerBadges } from "@/lib/youtube-review-badges";

export async function POST(
  request: NextRequest,
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
    const body = await request.json().catch(() => ({}));
    const voteType = (body.voteType || "UP") as "UP" | "DOWN";

    const review = await db.channelReview.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true, helpfulCount: true, notHelpfulCount: true },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.userId === user.id) {
      return NextResponse.json(
        { error: "You cannot vote on your own review", code: "OWNER_CANNOT_VOTE" },
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

    // If user already voted with the same type, remove the vote
    if (existingVote && existingVote.voteType === voteType) {
      await db.$transaction([
        db.channelReviewVote.delete({
          where: { id: existingVote.id },
        }),
        db.channelReview.update({
          where: { id: reviewId },
          data: {
            helpfulCount: existingVote.voteType === "UP" 
              ? Math.max(0, review.helpfulCount - 1)
              : review.helpfulCount,
            notHelpfulCount: existingVote.voteType === "DOWN"
              ? Math.max(0, review.notHelpfulCount - 1)
              : review.notHelpfulCount,
          },
        }),
      ]);

      await evaluateReviewerBadges(review.userId);
      return NextResponse.json({ added: false, voteType: null });
    }

    // If user voted with different type, update the vote
    if (existingVote && existingVote.voteType !== voteType) {
      await db.$transaction([
        db.channelReviewVote.update({
          where: { id: existingVote.id },
          data: { voteType },
        }),
        db.channelReview.update({
          where: { id: reviewId },
          data: {
            helpfulCount: voteType === "UP"
              ? review.helpfulCount + 1
              : Math.max(0, review.helpfulCount - 1),
            notHelpfulCount: voteType === "DOWN"
              ? review.notHelpfulCount + 1
              : Math.max(0, review.notHelpfulCount - 1),
          },
        }),
      ]);

      await evaluateReviewerBadges(review.userId);
      return NextResponse.json({ added: true, voteType });
    }

    // Create new vote
    await db.$transaction([
      db.channelReviewVote.create({
        data: {
          reviewId,
          userId: user.id,
          voteType,
        },
      }),
      db.channelReview.update({
        where: { id: reviewId },
        data: {
          helpfulCount: voteType === "UP" ? review.helpfulCount + 1 : review.helpfulCount,
          notHelpfulCount: voteType === "DOWN" ? review.notHelpfulCount + 1 : review.notHelpfulCount,
        },
      }),
    ]);

    await evaluateReviewerBadges(review.userId);
    return NextResponse.json({ added: true, voteType });
  } catch (error) {
    console.error("[ChannelReviews] vote toggle error", error);
    return NextResponse.json({ error: "Failed to update vote" }, { status: 500 });
  }
}


