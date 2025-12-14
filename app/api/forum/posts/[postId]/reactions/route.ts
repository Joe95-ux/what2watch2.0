import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

// GET - Get reaction status and count for a post
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { postId } = await params;
    const { userId: clerkUserId } = await auth();

    let userReaction: { reactionType: string } | null = null;

    if (clerkUserId) {
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });

      if (user) {
        const reaction = await db.forumPostReaction.findUnique({
          where: {
            postId_userId: {
              postId,
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

    const likeCount = await db.forumPostReaction.count({
      where: {
        postId,
        reactionType: "like",
      },
    });

    return NextResponse.json({
      isLiked: userReaction?.reactionType === "like",
      likeCount,
    });
  } catch (error) {
    console.error("Error fetching forum post reaction:", error);
    return NextResponse.json(
      { error: "Failed to fetch forum post reaction" },
      { status: 500 }
    );
  }
}

// POST - Toggle like reaction on a post
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

    const { postId } = await params;
    const body = await request.json();
    const { reactionType = "like" } = body;

    // Verify post exists
    const post = await db.forumPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const existingReaction = await db.forumPostReaction.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: user.id,
        },
      },
    });

    if (existingReaction) {
      // Remove reaction if clicking the same type
      if (existingReaction.reactionType === reactionType) {
        await db.forumPostReaction.delete({
          where: { id: existingReaction.id },
        });
        return NextResponse.json({ success: true, action: "removed" });
      } else {
        // Update reaction type
        await db.forumPostReaction.update({
          where: { id: existingReaction.id },
          data: { reactionType },
        });
        return NextResponse.json({ success: true, action: "updated" });
      }
    } else {
      // Create new reaction
      await db.forumPostReaction.create({
        data: {
          postId,
          userId: user.id,
          reactionType,
        },
      });
      return NextResponse.json({ success: true, action: "added" });
    }
  } catch (error) {
    console.error("Error toggling forum post reaction:", error);
    return NextResponse.json(
      { error: "Failed to toggle forum post reaction" },
      { status: 500 }
    );
  }
}

