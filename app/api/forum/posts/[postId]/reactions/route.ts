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

    // Calculate score (upvotes - downvotes)
    const [upvotes, downvotes] = await Promise.all([
      db.forumPostReaction.count({
        where: {
          postId,
          reactionType: "upvote",
        },
      }),
      db.forumPostReaction.count({
        where: {
          postId,
          reactionType: "downvote",
        },
      }),
    ]);

    const score = upvotes - downvotes;

    return NextResponse.json({
      reactionType: userReaction?.reactionType || null,
      score,
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
    const { reactionType } = body; // "upvote", "downvote", or null

    // Validate reaction type
    if (reactionType !== null && reactionType !== "upvote" && reactionType !== "downvote") {
      return NextResponse.json(
        { error: "Invalid reaction type. Must be 'upvote', 'downvote', or null" },
        { status: 400 }
      );
    }

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
      if (reactionType === null || existingReaction.reactionType === reactionType) {
        // Remove reaction
        await db.forumPostReaction.delete({
          where: { id: existingReaction.id },
        });
      } else {
        // Update reaction type
        await db.forumPostReaction.update({
          where: { id: existingReaction.id },
          data: { reactionType },
        });
      }
    } else if (reactionType !== null) {
      // Create new reaction
      await db.forumPostReaction.create({
        data: {
          postId,
          userId: user.id,
          reactionType,
        },
      });
    }

    // Calculate and return updated score
    const [upvotes, downvotes] = await Promise.all([
      db.forumPostReaction.count({
        where: {
          postId,
          reactionType: "upvote",
        },
      }),
      db.forumPostReaction.count({
        where: {
          postId,
          reactionType: "downvote",
        },
      }),
    ]);

    const score = upvotes - downvotes;

    // Update post score
    await db.forumPost.update({
      where: { id: postId },
      data: { score },
    });

    return NextResponse.json({
      success: true,
      reactionType: reactionType,
      score,
    });
  } catch (error) {
    console.error("Error toggling forum post reaction:", error);
    return NextResponse.json(
      { error: "Failed to toggle forum post reaction" },
      { status: 500 }
    );
  }
}

