import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// POST /api/reviews/[reviewId]/report - Report a review
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
    const { reason, description } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required" },
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

    // Check if user already reported this review
    const existingReport = await db.reviewReport.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId: user.id,
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: "You have already reported this review" },
        { status: 409 }
      );
    }

    // Create report
    await db.reviewReport.create({
      data: {
        reviewId,
        userId: user.id,
        reason,
        description: description || null,
      },
    });

    return NextResponse.json({ success: true, message: "Review reported successfully" });
  } catch (error) {
    console.error("Error reporting review:", error);
    return NextResponse.json(
      { error: "Failed to report review" },
      { status: 500 }
    );
  }
}

