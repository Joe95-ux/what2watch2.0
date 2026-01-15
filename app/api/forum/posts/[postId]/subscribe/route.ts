import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { assertObjectId } from "@/lib/assert-objectId";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

/**
 * POST - Subscribe to a post (follow for notifications)
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

    const { postId } = await params;

    // Check if postId is an ObjectId or slug
    const validObjectId = assertObjectId(postId);
    
    let post;
    if (validObjectId) {
      post = await db.forumPost.findUnique({
        where: { id: validObjectId },
        select: { id: true },
      });
    } else {
      post = await db.forumPost.findFirst({
        where: { slug: postId },
        select: { id: true },
      });
    }

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if already subscribed
    const existing = await db.forumPostSubscription.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: post.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ 
        success: true, 
        subscribed: true,
        message: "Already subscribed to this post" 
      });
    }

    // Create subscription
    await db.forumPostSubscription.create({
      data: {
        userId: user.id,
        postId: post.id,
      },
    });

    return NextResponse.json({ 
      success: true, 
      subscribed: true,
      message: "Subscribed to post" 
    });
  } catch (error) {
    console.error("Error subscribing to post:", error);
    return NextResponse.json(
      { error: "Failed to subscribe to post" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Unsubscribe from a post
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

    const { postId } = await params;

    // Check if postId is an ObjectId or slug
    const validObjectId = assertObjectId(postId);
    
    let post;
    if (validObjectId) {
      post = await db.forumPost.findUnique({
        where: { id: validObjectId },
        select: { id: true },
      });
    } else {
      post = await db.forumPost.findFirst({
        where: { slug: postId },
        select: { id: true },
      });
    }

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Delete subscription
    await db.forumPostSubscription.deleteMany({
      where: {
        userId: user.id,
        postId: post.id,
      },
    });

    return NextResponse.json({ 
      success: true, 
      subscribed: false,
      message: "Unsubscribed from post" 
    });
  } catch (error) {
    console.error("Error unsubscribing from post:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe from post" },
      { status: 500 }
    );
  }
}

/**
 * GET - Check subscription status
 */
export async function GET(
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

    // Check if postId is an ObjectId or slug
    const validObjectId = assertObjectId(postId);
    
    let post;
    if (validObjectId) {
      post = await db.forumPost.findUnique({
        where: { id: validObjectId },
        select: { id: true },
      });
    } else {
      post = await db.forumPost.findFirst({
        where: { slug: postId },
        select: { id: true },
      });
    }

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check subscription
    const subscription = await db.forumPostSubscription.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: post.id,
        },
      },
    });

    return NextResponse.json({ 
      subscribed: !!subscription 
    });
  } catch (error) {
    console.error("Error checking subscription:", error);
    return NextResponse.json(
      { error: "Failed to check subscription" },
      { status: 500 }
    );
  }
}

