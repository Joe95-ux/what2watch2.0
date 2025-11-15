import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// DELETE - Delete a comment
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

    // Verify comment exists and belongs to user
    const comment = await db.viewingLogComment.findFirst({
      where: {
        id: commentId,
        viewingLogId: logId,
        userId: user.id,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found or unauthorized" }, { status: 404 });
    }

    // Delete comment (replies will be cascade deleted)
    await db.viewingLogComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete comment API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete comment";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

