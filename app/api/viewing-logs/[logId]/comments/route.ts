import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch comments for a viewing log
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
): Promise<NextResponse<{ comments: unknown[] } | { error: string }>> {
  try {
    const { logId } = await params;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "newest"; // newest, oldest, most-liked

    const comments = await db.viewingLogComment.findMany({
      where: {
        viewingLogId: logId,
        parentCommentId: null, // Only top-level comments
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
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy:
        filter === "oldest"
          ? { createdAt: "asc" }
          : filter === "most-liked"
          ? { likes: "desc" }
          : { createdAt: "desc" },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Get comments API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch comments";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
): Promise<NextResponse<{ comment: unknown } | { error: string }>> {
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

    const { logId } = await params;
    const body = await request.json();
    const { content, parentCommentId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }

    // Verify viewing log exists
    const viewingLog = await db.viewingLog.findUnique({
      where: { id: logId },
    });

    if (!viewingLog) {
      return NextResponse.json({ error: "Viewing log not found" }, { status: 404 });
    }

    // If replying, verify parent comment exists and belongs to same log
    if (parentCommentId) {
      const parentComment = await db.viewingLogComment.findFirst({
        where: {
          id: parentCommentId,
          viewingLogId: logId,
        },
      });

      if (!parentComment) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
    }

    const comment = await db.viewingLogComment.create({
      data: {
        viewingLogId: logId,
        userId: user.id,
        content: content.trim(),
        parentCommentId: parentCommentId || null,
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

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Create comment API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create comment";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

