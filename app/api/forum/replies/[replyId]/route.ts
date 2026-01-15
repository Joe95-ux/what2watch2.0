import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { moderateContent } from "@/lib/moderation";
import { sanitizeContent } from "@/lib/server-html-sanitizer";

interface RouteParams {
  params: Promise<{ replyId: string }>;
}

// PATCH - Update a reply (only by author)
export async function PATCH(
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

    // Rate limiting - 20 edits per hour
    const rateLimitResult = checkRateLimit(
      `edit-reply:${user.id}`,
      20,
      60 * 60 * 1000 // 1 hour
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.error || "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "20",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    const { replyId } = await params;
    const body = await request.json();
    const { content } = body;

    const reply = await db.forumReply.findUnique({
      where: { id: replyId },
      select: { id: true, userId: true, postId: true },
    });

    if (!reply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    if (reply.userId !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own replies" },
        { status: 403 }
      );
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: "Content must be 5,000 characters or less" },
        { status: 400 }
      );
    }

    // Server-side content moderation and sanitization
    const contentModeration = moderateContent(content.trim(), {
      minLength: 1,
      maxLength: 5000,
      allowProfanity: false,
      sanitizeHtml: true,
    });

    if (!contentModeration.allowed) {
      return NextResponse.json(
        { error: contentModeration.error || "Content contains inappropriate content" },
        { status: 400 }
      );
    }

    // Sanitize HTML on server-side
    const sanitizedContent = sanitizeContent(contentModeration.sanitized || content.trim());

    const updatedReply = await db.forumReply.update({
      where: { id: replyId },
      data: {
        content: sanitizedContent,
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

    return NextResponse.json({ reply: updatedReply });
  } catch (error) {
    console.error("Error updating forum reply:", error);
    return NextResponse.json(
      { error: "Failed to update forum reply" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a reply (only by author)
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

    const reply = await db.forumReply.findUnique({
      where: { id: replyId },
      select: { id: true, userId: true, postId: true },
    });

    if (!reply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    if (reply.userId !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own replies" },
        { status: 403 }
      );
    }

    await db.forumReply.delete({
      where: { id: replyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting forum reply:", error);
    return NextResponse.json(
      { error: "Failed to delete forum reply" },
      { status: 500 }
    );
  }
}

