import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ replyId: string }>;
}

// GET - Get reaction status and count for a reply
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { replyId } = await params;
    const { userId: clerkUserId } = await auth();

    let userReaction: { reactionType: string } | null = null;

    if (clerkUserId) {
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });

      if (user) {
        const reaction = await db.forumReplyReaction.findUnique({
          where: {
            replyId_userId: {
              replyId,
              userId: user.id,
            },
          },
          select: {
            reactionType: true,
          },
        });
        userReaction = reaction ? { reactionType: reaction.reactionType } : null;
      }
    }

    const likeCount = await db.forumReplyReaction.count({
      where: {
        replyId,
        reactionType: "like",
      },
    });

    return NextResponse.json({
      isLiked: userReaction?.reactionType === "like",
      likeCount,
    });
  } catch (error) {
    console.error("Error fetching forum reply reaction:", error);
    return NextResponse.json(
      { error: "Failed to fetch forum reply reaction" },
      { status: 500 }
    );
  }
}

// POST - Toggle like reaction on a reply
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
    const body = await request.json();
    const { reactionType = "like" } = body;

    // Verify reply exists
    const reply = await db.forumReply.findUnique({
      where: { id: replyId },
      select: { id: true },
    });

    if (!reply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    const existingReaction = await db.forumReplyReaction.findUnique({
      where: {
        replyId_userId: {
          replyId,
          userId: user.id,
        },
      },
    });

    if (existingReaction) {
      // Remove reaction if clicking the same type
      if (existingReaction.reactionType === reactionType) {
        await db.forumReplyReaction.delete({
          where: { id: existingReaction.id },
        });
        return NextResponse.json({ success: true, action: "removed" });
      } else {
        // Update reaction type
        await db.forumReplyReaction.update({
          where: { id: existingReaction.id },
          data: { reactionType },
        });
        return NextResponse.json({ success: true, action: "updated" });
      }
    } else {
      // Create new reaction
      await db.forumReplyReaction.create({
        data: {
          replyId,
          userId: user.id,
          reactionType,
        },
      });
      return NextResponse.json({ success: true, action: "added" });
    }
  } catch (error) {
    console.error("Error toggling forum reply reaction:", error);
    return NextResponse.json(
      { error: "Failed to toggle forum reply reaction" },
      { status: 500 }
    );
  }
}

