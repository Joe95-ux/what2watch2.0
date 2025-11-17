import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// POST - Block a user from commenting on a list
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
): Promise<NextResponse<{ success: boolean; list?: unknown } | { error: string }>> {
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
    const body = await request.json();
    const { userIdToBlock } = body;

    if (!userIdToBlock || typeof userIdToBlock !== "string") {
      return NextResponse.json({ error: "User ID to block is required" }, { status: 400 });
    }

    // Verify list exists and user owns it
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { userId: true, blockedUsers: true },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized - only list owner can block users" }, { status: 403 });
    }

    if (userIdToBlock === user.id) {
      return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
    }

    // Check if user is already blocked
    if (list.blockedUsers.includes(userIdToBlock)) {
      return NextResponse.json({ error: "User is already blocked" }, { status: 400 });
    }

    // Add user to blocked list
    const updatedList = await db.list.update({
      where: { id: listId },
      data: {
        blockedUsers: {
          push: userIdToBlock,
        },
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
        items: true,
      },
    });

    return NextResponse.json({ success: true, list: updatedList });
  } catch (error) {
    console.error("Block user API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to block user";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE - Unblock a user from commenting on a list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
): Promise<NextResponse<{ success: boolean; list?: unknown } | { error: string }>> {
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
    const { searchParams } = new URL(request.url);
    const userIdToUnblock = searchParams.get("userId");

    if (!userIdToUnblock) {
      return NextResponse.json({ error: "User ID to unblock is required" }, { status: 400 });
    }

    // Verify list exists and user owns it
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { userId: true, blockedUsers: true },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized - only list owner can unblock users" }, { status: 403 });
    }

    // Check if user is blocked
    if (!list.blockedUsers.includes(userIdToUnblock)) {
      return NextResponse.json({ error: "User is not blocked" }, { status: 400 });
    }

    // Remove user from blocked list
    const updatedList = await db.list.update({
      where: { id: listId },
      data: {
        blockedUsers: {
          set: list.blockedUsers.filter((id) => id !== userIdToUnblock),
        },
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
        items: true,
      },
    });

    return NextResponse.json({ success: true, list: updatedList });
  } catch (error) {
    console.error("Unblock user API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to unblock user";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

