import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Get reports for content owned by the current user
export async function GET(request: NextRequest) {
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

    // Get post reports for user's posts
    const postReports = await db.forumPostReport.findMany({
      where: {
        post: {
          userId: user.id,
        },
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get reply reports for user's replies
    const replyReports = await db.forumReplyReport.findMany({
      where: {
        reply: {
          userId: user.id,
        },
      },
      include: {
        reply: {
          select: {
            id: true,
            content: true,
            post: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      postReports: postReports.map((r) => ({
        id: r.id,
        type: "post",
        targetId: r.postId,
        target: r.post,
        reporter: r.user,
        reason: r.reason,
        description: r.description,
        status: r.status,
        appealReason: r.appealReason,
        appealAt: r.appealAt,
        reviewedBy: r.reviewedBy,
        reviewedAt: r.reviewedAt,
        reviewNotes: r.reviewNotes,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      replyReports: replyReports.map((r) => ({
        id: r.id,
        type: "reply",
        targetId: r.replyId,
        target: {
          id: r.reply.id,
          content: r.reply.content,
          post: r.reply.post,
        },
        reporter: r.user,
        reason: r.reason,
        description: r.description,
        status: r.status,
        appealReason: r.appealReason,
        appealAt: r.appealAt,
        reviewedBy: r.reviewedBy,
        reviewedAt: r.reviewedAt,
        reviewNotes: r.reviewNotes,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching user reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

