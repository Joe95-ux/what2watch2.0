import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ tmdbId: string }>;
}

// POST - Like or dislike content
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

    const { tmdbId } = await params;
    const body = await request.json();
    const { mediaType, reactionType } = body; // reactionType: "like" or "dislike"

    if (!mediaType || !reactionType) {
      return NextResponse.json(
        { error: "Missing mediaType or reactionType" },
        { status: 400 }
      );
    }

    if (reactionType !== "like" && reactionType !== "dislike") {
      return NextResponse.json(
        { error: "Invalid reactionType. Must be 'like' or 'dislike'" },
        { status: 400 }
      );
    }

    const tmdbIdNum = parseInt(tmdbId, 10);
    if (isNaN(tmdbIdNum)) {
      return NextResponse.json(
        { error: "Invalid tmdbId" },
        { status: 400 }
      );
    }

    // Check if user already has a reaction for this content
    const existingReaction = await db.contentReaction.findUnique({
      where: {
        userId_tmdbId_mediaType: {
          userId: user.id,
          tmdbId: tmdbIdNum,
          mediaType,
        },
      },
    });

    if (existingReaction) {
      if (existingReaction.reactionType === reactionType) {
        // User is clicking the same reaction again, so remove it
        await db.contentReaction.delete({
          where: {
            id: existingReaction.id,
          },
        });
        return NextResponse.json({
          success: true,
          reaction: null,
          removed: true,
        });
      } else {
        // User is switching from like to dislike or vice versa
        const updated = await db.contentReaction.update({
          where: {
            id: existingReaction.id,
          },
          data: {
            reactionType,
          },
        });
        return NextResponse.json({
          success: true,
          reaction: updated,
          removed: false,
        });
      }
    } else {
      // Create new reaction
      const reaction = await db.contentReaction.create({
        data: {
          userId: user.id,
          tmdbId: tmdbIdNum,
          mediaType,
          reactionType,
        },
      });
      return NextResponse.json({
        success: true,
        reaction,
        removed: false,
      });
    }
  } catch (error) {
    console.error("Error reacting to content:", error);
    return NextResponse.json(
      { error: "Failed to react to content" },
      { status: 500 }
    );
  }
}

// GET - Get reaction status and counts for content
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { tmdbId } = await params;
    const { searchParams } = new URL(request.url);
    const mediaType = searchParams.get("mediaType");

    if (!mediaType) {
      return NextResponse.json(
        { error: "Missing mediaType query parameter" },
        { status: 400 }
      );
    }

    const tmdbIdNum = parseInt(tmdbId, 10);
    if (isNaN(tmdbIdNum)) {
      return NextResponse.json(
        { error: "Invalid tmdbId" },
        { status: 400 }
      );
    }

    // Get current user's reaction (if authenticated)
    const { userId: clerkUserId } = await auth();
    let userReaction: { reactionType: string } | null = null;

    if (clerkUserId) {
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });

      if (user) {
        const reaction = await db.contentReaction.findUnique({
          where: {
            userId_tmdbId_mediaType: {
              userId: user.id,
              tmdbId: tmdbIdNum,
              mediaType,
            },
          },
          select: {
            reactionType: true,
          },
        });
        userReaction = reaction ? { reactionType: reaction.reactionType } : null;
      }
    }

    // Get counts
    const [likeCount, dislikeCount] = await Promise.all([
      db.contentReaction.count({
        where: {
          tmdbId: tmdbIdNum,
          mediaType,
          reactionType: "like",
        },
      }),
      db.contentReaction.count({
        where: {
          tmdbId: tmdbIdNum,
          mediaType,
          reactionType: "dislike",
        },
      }),
    ]);

    return NextResponse.json({
      isLiked: userReaction?.reactionType === "like",
      isDisliked: userReaction?.reactionType === "dislike",
      likeCount,
      dislikeCount,
    });
  } catch (error) {
    console.error("Error fetching reaction status:", error);
    return NextResponse.json(
      { error: "Failed to fetch reaction status" },
      { status: 500 }
    );
  }
}

