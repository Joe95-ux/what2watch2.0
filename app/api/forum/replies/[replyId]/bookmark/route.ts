import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { assertObjectId } from "@/lib/assert-objectId";

interface RouteParams {
  params: Promise<{ replyId: string }>;
}

/**
 * GET - Check bookmark status
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ bookmarked: false });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ bookmarked: false });
    }

    const { replyId } = await params;
    const validObjectId = assertObjectId(replyId);

    if (!validObjectId) {
      return NextResponse.json({ bookmarked: false });
    }

    // Check bookmark
    const bookmark = await db.forumReplyBookmark.findUnique({
      where: {
        userId_replyId: {
          userId: user.id,
          replyId: validObjectId,
        },
      },
    });

    return NextResponse.json({ 
      bookmarked: !!bookmark 
    });
  } catch (error) {
    console.error("Error checking reply bookmark:", error);
    return NextResponse.json({ bookmarked: false });
  }
}

/**
 * POST - Bookmark a reply
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
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

    const { replyId } = await params;
    const validObjectId = assertObjectId(replyId);

    if (!validObjectId) {
      return NextResponse.json({ error: "Invalid reply ID" }, { status: 400 });
    }

    // Check if reply exists
    const reply = await db.forumReply.findUnique({
      where: { id: validObjectId },
      select: { id: true },
    });

    if (!reply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    // Check if already bookmarked
    const existing = await db.forumReplyBookmark.findUnique({
      where: {
        userId_replyId: {
          userId: user.id,
          replyId: validObjectId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ 
        success: true, 
        bookmarked: true,
        message: "Comment already saved" 
      });
    }

    // Create bookmark
    await db.forumReplyBookmark.create({
      data: {
        userId: user.id,
        replyId: validObjectId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      bookmarked: true,
      message: "Comment saved" 
    });
  } catch (error) {
    console.error("Error bookmarking reply:", error);
    return NextResponse.json(
      { error: "Failed to save comment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Unbookmark a reply
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
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

    const { replyId } = await params;
    const validObjectId = assertObjectId(replyId);

    if (!validObjectId) {
      return NextResponse.json({ error: "Invalid reply ID" }, { status: 400 });
    }

    // Delete bookmark
    await db.forumReplyBookmark.deleteMany({
      where: {
        userId: user.id,
        replyId: validObjectId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      bookmarked: false,
      message: "Comment unsaved" 
    });
  } catch (error) {
    console.error("Error unbookmarking reply:", error);
    return NextResponse.json(
      { error: "Failed to unsave comment" },
      { status: 500 }
    );
  }
}

