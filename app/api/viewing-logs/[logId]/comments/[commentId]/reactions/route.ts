import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// POST - Add a reaction to a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string; commentId: string }> }
): Promise<NextResponse<{ success: boolean; reaction?: unknown } | { error: string }>> {
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

    const { logId, commentId } = await params;
    const body = await request.json();
    const { reactionType } = body;

    if (!reactionType || typeof reactionType !== "string") {
      return NextResponse.json({ error: "Reaction type is required" }, { status: 400 });
    }

    // Validate reaction type (must be "like" or a valid emoji)
    const isValidEmoji = /^[\p{Emoji}]$/u.test(reactionType);
    if (reactionType !== "like" && !isValidEmoji) {
      return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
    }

    // Verify comment exists and belongs to the log
    const comment = await db.viewingLogComment.findFirst({
      where: {
        id: commentId,
        viewingLogId: logId,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Check if reaction already exists
    const existingReaction = await db.commentReaction.findUnique({
      where: {
        commentId_userId_reactionType: {
          commentId,
          userId: user.id,
          reactionType,
        },
      },
    });

    if (existingReaction) {
      return NextResponse.json({ error: "Reaction already exists" }, { status: 400 });
    }

    // Create reaction
    const reaction = await db.commentReaction.create({
      data: {
        commentId,
        userId: user.id,
        reactionType,
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
      },
    });

    // Update likes count if it's a like reaction
    if (reactionType === "like") {
      await db.viewingLogComment.update({
        where: { id: commentId },
        data: { likes: { increment: 1 } },
      });
    }

    return NextResponse.json({ success: true, reaction });
  } catch (error) {
    console.error("Add reaction API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to add reaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE - Remove a reaction from a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string; commentId: string }> }
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
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

    const { logId, commentId } = await params;
    const { searchParams } = new URL(request.url);
    const reactionType = searchParams.get("reactionType");

    if (!reactionType) {
      return NextResponse.json({ error: "Reaction type is required" }, { status: 400 });
    }

    // Verify comment exists
    const comment = await db.viewingLogComment.findFirst({
      where: {
        id: commentId,
        viewingLogId: logId,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Find and delete reaction
    const reaction = await db.commentReaction.findUnique({
      where: {
        commentId_userId_reactionType: {
          commentId,
          userId: user.id,
          reactionType,
        },
      },
    });

    if (!reaction) {
      return NextResponse.json({ error: "Reaction not found" }, { status: 404 });
    }

    await db.commentReaction.delete({
      where: { id: reaction.id },
    });

    // Update likes count if it's a like reaction
    if (reactionType === "like") {
      await db.viewingLogComment.update({
        where: { id: commentId },
        data: { likes: { decrement: 1 } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove reaction API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to remove reaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// GET - Get reactions for a comment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string; commentId: string }> }
): Promise<NextResponse<{ reactions: Record<string, unknown[]> } | { error: string }>> {
  try {
    const { commentId } = await params;

    const reactions = await db.commentReaction.findMany({
      where: { commentId },
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
      orderBy: { createdAt: "asc" },
    });

    // Group reactions by type
    const groupedReactions = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.reactionType]) {
        acc[reaction.reactionType] = [];
      }
      acc[reaction.reactionType].push(reaction);
      return acc;
    }, {} as Record<string, (typeof reactions)[number][]>);

    return NextResponse.json({ reactions: groupedReactions });
  } catch (error) {
    console.error("Get reactions API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to get reactions";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

