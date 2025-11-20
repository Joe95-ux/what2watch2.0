import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// POST /api/reviews/[reviewId]/reactions - Add or remove a reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewId } = await params;
    const body = await request.json();
    const { reactionType } = body;

    if (!reactionType) {
      return NextResponse.json(
        { error: "reactionType is required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const review = await db.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Check if reaction already exists
    const existingReaction = await db.reviewReaction.findUnique({
      where: {
        reviewId_userId_reactionType: {
          reviewId,
          userId: user.id,
          reactionType,
        },
      },
    });

    if (existingReaction) {
      // Remove reaction
      await db.reviewReaction.delete({
        where: { id: existingReaction.id },
      });

      // Update helpful count if it was a helpful reaction
      if (reactionType === "helpful") {
        await db.review.update({
          where: { id: reviewId },
          data: {
            helpful: {
              decrement: 1,
            },
          },
        });
      }

      return NextResponse.json({ added: false });
    } else {
      // Add reaction
      await db.reviewReaction.create({
        data: {
          reviewId,
          userId: user.id,
          reactionType,
        },
      });

      // Update helpful count if it's a helpful reaction
      if (reactionType === "helpful") {
        await db.review.update({
          where: { id: reviewId },
          data: {
            helpful: {
              increment: 1,
            },
          },
        });
      }

      return NextResponse.json({ added: true });
    }
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return NextResponse.json(
      { error: "Failed to toggle reaction" },
      { status: 500 }
    );
  }
}

