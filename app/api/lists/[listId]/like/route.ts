import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// POST - Like a list (PUBLIC or FOLLOWERS_ONLY only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
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

    const { listId } = await params;

    // Check if list exists and is PUBLIC or FOLLOWERS_ONLY
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { id: true, userId: true, visibility: true },
    });

    if (!list) {
      return NextResponse.json(
        { error: "List not found" },
        { status: 404 }
      );
    }

    // Can't like your own list
    if (list.userId === user.id) {
      return NextResponse.json(
        { error: "Cannot like your own list" },
        { status: 400 }
      );
    }

    // Can only like PUBLIC or FOLLOWERS_ONLY lists
    if (list.visibility === "PRIVATE") {
      return NextResponse.json(
        { error: "Cannot like private lists" },
        { status: 403 }
      );
    }

    // If FOLLOWERS_ONLY, check if user is following the list owner
    if (list.visibility === "FOLLOWERS_ONLY") {
      const isFollowing = await db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: list.userId,
          },
        },
      });

      if (!isFollowing) {
        return NextResponse.json(
          { error: "Cannot like lists from users you don't follow" },
          { status: 403 }
        );
      }
    }

    // Check if already liked
    const existingLike = await db.likedList.findUnique({
      where: {
        userId_listId: {
          userId: user.id,
          listId: listId,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json(
        { error: "List already liked" },
        { status: 400 }
      );
    }

    // Create liked list entry
    await db.likedList.create({
      data: {
        userId: user.id,
        listId: listId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error liking list:", error);
    return NextResponse.json(
      { error: "Failed to like list" },
      { status: 500 }
    );
  }
}

// DELETE - Unlike a list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
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

    const { listId } = await params;

    // Delete liked list entry
    const deleted = await db.likedList.deleteMany({
      where: {
        userId: user.id,
        listId: listId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "List not liked" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unliking list:", error);
    return NextResponse.json(
      { error: "Failed to unlike list" },
      { status: 500 }
    );
  }
}

// GET - Check if current user has liked the list
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ isLiked: false });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ isLiked: false });
    }

    const { listId } = await params;

    const liked = await db.likedList.findUnique({
      where: {
        userId_listId: {
          userId: user.id,
          listId: listId,
        },
      },
    });

    return NextResponse.json({ isLiked: !!liked });
  } catch (error) {
    console.error("Error checking like status:", error);
    return NextResponse.json({ isLiked: false });
  }
}

