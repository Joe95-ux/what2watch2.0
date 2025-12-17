import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Get user's public lists
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: identifier } = await params;
    const { userId: clerkUserId } = await auth();

    // Look up user by username or ID
    const targetUser = await db.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { id: identifier },
        ],
      },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userId = targetUser.id;

    // Get current user if authenticated
    let currentUserId: string | null = null;
    if (clerkUserId) {
      const currentUser = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
      currentUserId = currentUser?.id || null;
    }

    // Build visibility filter
    const visibilityFilter: {
      OR: Array<{ visibility: "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE" }>;
    } = {
      OR: [
        { visibility: "PUBLIC" },
      ],
    };

    // If viewing own profile or following the user, include FOLLOWERS_ONLY lists
    if (currentUserId === userId) {
      // Own profile - show all lists
      visibilityFilter.OR.push({ visibility: "FOLLOWERS_ONLY" });
      visibilityFilter.OR.push({ visibility: "PRIVATE" });
    } else if (currentUserId) {
      // Check if following
      const isFollowing = await db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: userId,
          },
        },
      });
      if (isFollowing) {
        visibilityFilter.OR.push({ visibility: "FOLLOWERS_ONLY" });
      }
    }

    const lists = await db.list.findMany({
      where: {
        userId,
        ...visibilityFilter,
      },
      include: {
        items: {
          orderBy: { position: "asc" },
          take: 3, // Get up to 3 items for poster grid
          select: {
            position: true,
            posterPath: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ lists });
  } catch (error) {
    console.error("Error fetching user lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch user lists" },
      { status: 500 }
    );
  }
}

