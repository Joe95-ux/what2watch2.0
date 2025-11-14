import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Get list of users a specific user is following
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    const currentUser = clerkUserId
      ? await db.user.findUnique({
          where: { clerkId: clerkUserId },
          select: { id: true },
        })
      : null;

    const { userId: targetUserId } = await params;

    // Get all users being followed
    const follows = await db.follow.findMany({
      where: { followerId: targetUserId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const following = follows.map((follow) => ({
      id: follow.following.id,
      username: follow.following.username,
      displayName: follow.following.displayName,
      avatarUrl: follow.following.avatarUrl,
      bio: follow.following.bio,
      followedAt: follow.createdAt,
      isFollowing: false, // Will be set below
    }));

    // Resolve isFollowing for all users in parallel
    if (currentUser) {
      const followingIds = await db.follow.findMany({
        where: { followerId: currentUser.id },
        select: { followingId: true },
      });
      const followingSet = new Set(followingIds.map((f) => f.followingId));

      following.forEach((user) => {
        user.isFollowing = followingSet.has(user.id);
      });
    }

    return NextResponse.json({ following });
  } catch (error) {
    console.error("Error fetching following:", error);
    return NextResponse.json(
      { error: "Failed to fetch following" },
      { status: 500 }
    );
  }
}

