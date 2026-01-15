import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

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

    // Calculate score (upvotes - downvotes)
    const [upvotes, downvotes] = await Promise.all([
      db.forumReplyReaction.count({
        where: {
          replyId,
          reactionType: "upvote",
        },
      }),
      db.forumReplyReaction.count({
        where: {
          replyId,
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
    console.error("Error fetching forum reply reaction:", error);
    return NextResponse.json(
      { error: "Failed to fetch forum reply reaction" },
      { status: 500 }
    );
  }
}

// POST - Toggle upvote/downvote reaction on a reply
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

    // Rate limiting - 50 reactions per hour
    const rateLimitResult = checkRateLimit(
      user.id,
      50,
      60 * 60 * 1000 // 1 hour
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.error || "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "50",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    const { replyId } = await params;
    const body = await request.json();
    const { reactionType } = body; // "upvote", "downvote", or null

    // Validate reaction type
    if (reactionType !== null && reactionType !== "upvote" && reactionType !== "downvote") {
      return NextResponse.json(
        { error: "Invalid reaction type. Must be 'upvote', 'downvote', or null" },
        { status: 400 }
      );
    }

    // Verify reply exists
    const reply = await db.forumReply.findUnique({
      where: { id: replyId },
      select: { id: true },
    });

    if (!reply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    // Wrap all operations in a transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      const existingReaction = await tx.forumReplyReaction.findUnique({
        where: {
          replyId_userId: {
            replyId,
            userId: user.id,
          },
        },
      });

      if (existingReaction) {
        if (reactionType === null || existingReaction.reactionType === reactionType) {
          // Remove reaction
          await tx.forumReplyReaction.delete({
            where: { id: existingReaction.id },
          });
        } else {
          // Update reaction type
          await tx.forumReplyReaction.update({
            where: { id: existingReaction.id },
            data: { reactionType },
          });
        }
      } else if (reactionType !== null) {
        // Create new reaction
        await tx.forumReplyReaction.create({
          data: {
            replyId,
            userId: user.id,
            reactionType,
          },
        });
      }

      // Calculate and return updated score within the same transaction
      const [upvotes, downvotes] = await Promise.all([
        tx.forumReplyReaction.count({
          where: {
            replyId,
            reactionType: "upvote",
          },
        }),
        tx.forumReplyReaction.count({
          where: {
            replyId,
            reactionType: "downvote",
          },
        }),
      ]);

      const score = upvotes - downvotes;

      // Update reply score within the same transaction
      await tx.forumReply.update({
        where: { id: replyId },
        data: { score },
      });

      return { reactionType, score, upvotes, downvotes };
    });

    return NextResponse.json({
      success: true,
      reactionType: result.reactionType,
      score: result.score,
    });
  } catch (error) {
    console.error("Error toggling forum reply reaction:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error("Error details:", errorDetails);
    
    // Return more detailed error information for debugging
    return NextResponse.json(
      { 
        error: "Failed to toggle forum reply reaction",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

