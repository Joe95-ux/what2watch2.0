import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

// POST - Report a forum post
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await params;
    const body = await request.json();
    const { reason, description } = body;

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Report reason is required" },
        { status: 400 }
      );
    }

    // Get user
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if postId is ObjectID or slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(postId);
    const post = isObjectId
      ? await db.forumPost.findUnique({ where: { id: postId }, select: { id: true } })
      : await db.forumPost.findFirst({ where: { slug: postId }, select: { id: true } });
    
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if user already reported this post
    const existingReport = await db.forumPostReport.findUnique({
      where: {
        postId_userId: {
          postId: post.id,
          userId: user.id,
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: "You have already reported this post" },
        { status: 400 }
      );
    }

    // Create report
    await db.forumPostReport.create({
      data: {
        postId: post.id,
        userId: user.id,
        reason: reason.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, message: "Post reported successfully" });
  } catch (error) {
    console.error("Error reporting forum post:", error);
    return NextResponse.json(
      { error: "Failed to report post" },
      { status: 500 }
    );
  }
}

