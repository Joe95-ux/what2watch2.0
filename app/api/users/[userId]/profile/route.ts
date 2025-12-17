import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get user profile (supports both username and userId)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: identifier } = await params;

    // Try to find user by username first, then by ID
    let user = await db.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { id: identifier },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get counts using the actual user ID
    const [followersCount, followingCount, playlistsCount, listsCount] = await Promise.all([
      db.follow.count({ where: { followingId: user.id } }),
      db.follow.count({ where: { followerId: user.id } }),
      db.playlist.count({ where: { userId: user.id } }),
      db.list.count({ where: { userId: user.id, visibility: "PUBLIC" } }), // Only count public lists
    ]);

    return NextResponse.json({
      user: {
        ...user,
        followersCount,
        followingCount,
        playlistsCount,
        listsCount,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

