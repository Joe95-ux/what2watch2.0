import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { assertObjectId } from "@/lib/assert-objectId";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

/**
 * POST - Bookmark a post
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

    // Check if already bookmarked
    const existing = await db.forumBookmark.findUnique({
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
        bookmarked: true,
        message: "Post already bookmarked" 
      });
    }

    // Create bookmark
    await db.forumBookmark.create({
      data: {
        userId: user.id,
        postId: post.id,
      },
    });

    return NextResponse.json({ 
      success: true, 
      bookmarked: true,
      message: "Post bookmarked" 
    });
  } catch (error) {
    console.error("Error bookmarking post:", error);
    return NextResponse.json(
      { error: "Failed to bookmark post" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Unbookmark a post
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

    // Delete bookmark
    await db.forumBookmark.deleteMany({
      where: {
        userId: user.id,
        postId: post.id,
      },
    });

    return NextResponse.json({ 
      success: true, 
      bookmarked: false,
      message: "Post unbookmarked" 
    });
  } catch (error) {
    console.error("Error unbookmarking post:", error);
    return NextResponse.json(
      { error: "Failed to unbookmark post" },
      { status: 500 }
    );
  }
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

    // Check bookmark
    const bookmark = await db.forumBookmark.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: post.id,
        },
      },
    });

    return NextResponse.json({ 
      bookmarked: !!bookmark 
    });
  } catch (error) {
    console.error("Error checking bookmark:", error);
    return NextResponse.json(
      { error: "Failed to check bookmark" },
      { status: 500 }
    );
  }
}

