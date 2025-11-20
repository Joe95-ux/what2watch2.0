import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET /api/reviews/[reviewId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;

    const review = await db.review.findUnique({
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
        reactions: {
          select: {
            id: true,
            userId: true,
            reactionType: true,
          },
        },
        _count: {
          select: {
            reactions: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    type ReviewWithRelations = Prisma.ReviewGetPayload<{
      include: {
        user: {
          select: {
            id: true;
            username: true;
            displayName: true;
            avatarUrl: true;
          };
        };
        reactions: {
          select: {
            id: true;
            userId: true;
            reactionType: true;
          };
        };
        _count: {
          select: {
            reactions: true;
          };
        };
      };
    }>;

    const reactionCounts: Record<string, number> = {};
    (review as ReviewWithRelations).reactions.forEach((reaction) => {
      reactionCounts[reaction.reactionType] =
        (reactionCounts[reaction.reactionType] || 0) + 1;
    });

    return NextResponse.json({
      ...review,
      reactionCounts,
      totalReactions: review._count.reactions,
    });
  } catch (error) {
    console.error("Error fetching review:", error);
    return NextResponse.json(
      { error: "Failed to fetch review" },
      { status: 500 }
    );
  }
}

// PUT /api/reviews/[reviewId] - Update a review
export async function PUT(
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
    const { rating, title, content } = body;

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

    if (review.userId !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own reviews" },
        { status: 403 }
      );
    }

    const updatedReview = await db.review.update({
      where: { id: reviewId },
      data: {
        ...(rating !== undefined && { rating }),
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            reactionType: true,
          },
        },
        _count: {
          select: {
            reactions: true,
          },
        },
      },
    });

    type ReviewWithRelations = Prisma.ReviewGetPayload<{
      include: {
        user: {
          select: {
            id: true;
            username: true;
            displayName: true;
            avatarUrl: true;
          };
        };
        reactions: {
          select: {
            id: true;
            userId: true;
            reactionType: true;
          };
        };
        _count: {
          select: {
            reactions: true;
          };
        };
      };
    }>;

    const reactionCounts: Record<string, number> = {};
    (updatedReview as ReviewWithRelations).reactions.forEach((reaction) => {
      reactionCounts[reaction.reactionType] =
        (reactionCounts[reaction.reactionType] || 0) + 1;
    });

    return NextResponse.json({
      ...updatedReview,
      reactionCounts,
      totalReactions: updatedReview._count.reactions,
    });
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews/[reviewId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewId } = await params;

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

    if (review.userId !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own reviews" },
        { status: 403 }
      );
    }

    await db.review.delete({
      where: { id: reviewId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}

