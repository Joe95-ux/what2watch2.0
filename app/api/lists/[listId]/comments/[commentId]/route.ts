import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { moderateContent } from "@/lib/moderation";

// PATCH - Update a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string; commentId: string }> }
): Promise<NextResponse<{ success: boolean; comment?: unknown } | { error: string }>> {
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

    const { listId, commentId } = await params;
    const { content } = await request.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }

    // Content moderation
    const moderationResult = moderateContent(content, {
      minLength: 1,
      maxLength: 5000,
      allowProfanity: false,
      sanitizeHtml: true,
    });

    if (!moderationResult.allowed) {
      return NextResponse.json(
        { error: moderationResult.error || "Comment does not meet our content guidelines." },
        { status: 400 }
      );
    }

    // Verify comment exists and belongs to user
    const comment = await db.listComment.findFirst({
      where: {
        id: commentId,
        listId: listId,
        userId: user.id,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found or unauthorized" }, { status: 404 });
    }

    // Update comment
    const updatedComment = await db.listComment.update({
      where: { id: commentId },
      data: {
        content: moderationResult.sanitized || content.trim(),
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
        replies: {
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
        },
      },
    });

    return NextResponse.json({ success: true, comment: updatedComment });
  } catch (error) {
    console.error("Update comment API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update comment";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string; commentId: string }> }
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

    const { listId, commentId } = await params;

    // Verify comment exists and belongs to user or user owns the list
    const comment = await db.listComment.findFirst({
      where: {
        id: commentId,
        listId: listId,
      },
      include: {
        list: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // User can delete their own comment or list owner can delete any comment
    if (comment.userId !== user.id && comment.list.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete comment (cascade will handle replies)
    await db.listComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete comment API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete comment";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

