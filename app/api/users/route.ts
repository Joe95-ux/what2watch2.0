import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Get all users with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    // Get current user if authenticated (to check follow status)
    const { userId: clerkUserId } = await auth();
    let currentUserId: string | undefined;
    if (clerkUserId) {
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
      currentUserId = user?.id;
    }

    // Note: MongoDB with Prisma doesn't support case-insensitive search directly
    // We'll filter results in memory for case-insensitive matching
    // Get all users (we'll filter in memory for case-insensitive search)
    const allUsers = await db.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter users if search is provided (case-insensitive)
    let filteredUsers = allUsers;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = allUsers.filter(
        (user) =>
          (user.username?.toLowerCase().includes(searchLower)) ||
          (user.displayName?.toLowerCase().includes(searchLower))
      );
    }

    const total = filteredUsers.length;
    const users = filteredUsers.slice(skip, skip + limit);

    // Get follow status for current user
    let followingIds: string[] = [];
    if (currentUserId) {
      const follows = await db.follow.findMany({
        where: { followerId: currentUserId },
        select: { followingId: true },
      });
      followingIds = follows.map((f) => f.followingId);
    }

    // Get follower counts for each user
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const [followersCount, followingCount, listsCount] = await Promise.all([
          db.follow.count({ where: { followingId: user.id } }),
          db.follow.count({ where: { followerId: user.id } }),
          db.list.count({ where: { userId: user.id, visibility: "PUBLIC" } }),
        ]);

        return {
          ...user,
          followersCount,
          followingCount,
          listsCount,
          isFollowing: followingIds.includes(user.id),
        };
      })
    );

    return NextResponse.json({
      users: usersWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

