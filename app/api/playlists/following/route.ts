import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { PlaylistVisibility } from "@prisma/client";

// GET - Get playlists from users you follow
export async function GET(request: NextRequest) {
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

    // Get all users you're following
    const follows = await db.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    });

    const followingIds = follows.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return NextResponse.json({ playlists: [] });
    }

    // Get playlists from followed users (PUBLIC or FOLLOWERS_ONLY)
    // Support both visibility enum and legacy isPublic field
    const playlists = await db.playlist.findMany({
      where: {
        userId: { in: followingIds },
        OR: [
          { visibility: PlaylistVisibility.PUBLIC },
          { visibility: PlaylistVisibility.FOLLOWERS_ONLY },
          { isPublic: true }, // Support legacy isPublic field
        ],
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
        items: {
          take: 1,
          orderBy: { order: "asc" },
          select: {
            posterPath: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50, // Limit to 50 most recent
    });

    return NextResponse.json({ playlists });
  } catch (error) {
    console.error("Error fetching following playlists:", error);
    return NextResponse.json(
      { error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}

