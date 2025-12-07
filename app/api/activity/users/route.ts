import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Get list of users in the activity feed (current user + following)
export async function GET(request: NextRequest): Promise<NextResponse<{ users: unknown[] } | { error: string }>> {
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

    // Get users that the current user follows
    const following = await db.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    });

    const followingIds = following.map((f: { followingId: string }) => f.followingId);
    
    // Include current user's own activities
    const userIds = [user.id, ...followingIds];

    // Get unique users from activities
    const activities = await db.activity.findMany({
      where: {
        userId: { in: userIds },
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    const uniqueUserIds = [...new Set(activities.map((a) => a.userId))];

    // Fetch user details
    const users = await db.user.findMany({
      where: {
        id: { in: uniqueUserIds },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
      orderBy: {
        displayName: "asc",
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching activity users:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity users" },
      { status: 500 }
    );
  }
}

