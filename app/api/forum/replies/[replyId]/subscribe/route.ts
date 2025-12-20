import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { assertObjectId } from "@/lib/assert-objectId";

interface RouteParams {
  params: Promise<{ replyId: string }>;
}

/**
 * GET - Check if user is subscribed to a reply
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ subscribed: false });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ subscribed: false });
    }

    const { replyId } = await params;
    const validObjectId = assertObjectId(replyId);

    if (!validObjectId) {
      return NextResponse.json({ subscribed: false });
    }

    const subscription = await db.forumReplySubscription.findUnique({
      where: {
        userId_replyId: {
          userId: user.id,
          replyId: validObjectId,
        },
      },
    });

    return NextResponse.json({ subscribed: !!subscription });
  } catch (error) {
    console.error("Error checking reply subscription:", error);
    return NextResponse.json({ subscribed: false });
  }
}

/**
 * POST - Subscribe to a reply (follow for notifications)
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

    // Check if already subscribed
    const existing = await db.forumReplySubscription.findUnique({
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
        subscribed: true,
        message: "Already following this comment" 
      });
    }

    // Create subscription
    await db.forumReplySubscription.create({
      data: {
        userId: user.id,
        replyId: validObjectId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      subscribed: true,
      message: "Following comment" 
    });
  } catch (error) {
    console.error("Error subscribing to reply:", error);
    return NextResponse.json(
      { error: "Failed to follow comment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Unsubscribe from a reply
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

    // Delete subscription
    await db.forumReplySubscription.deleteMany({
      where: {
        userId: user.id,
        replyId: validObjectId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      subscribed: false,
      message: "Unfollowed comment" 
    });
  } catch (error) {
    console.error("Error unsubscribing from reply:", error);
    return NextResponse.json(
      { error: "Failed to unfollow comment" },
      { status: 500 }
    );
  }
}

