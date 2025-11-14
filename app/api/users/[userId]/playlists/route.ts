import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { PlaylistVisibility } from "@prisma/client";

// GET - Get public playlists of a specific user
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

    // Check if current user is following target user
    let isFollowing = false;
    if (currentUser && currentUser.id !== targetUserId) {
      const follow = await db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUser.id,
            followingId: targetUserId,
          },
        },
      });
      isFollowing = !!follow;
    }

    // Build visibility filter
    const visibilityFilter: Array<{ visibility: PlaylistVisibility }> = [
      { visibility: PlaylistVisibility.PUBLIC },
    ];

    // If current user is the owner, show all playlists
    if (currentUser && currentUser.id === targetUserId) {
      // Show all playlists for own profile
    } else if (isFollowing) {
      // If following, show PUBLIC and FOLLOWERS_ONLY
      visibilityFilter.push({ visibility: PlaylistVisibility.FOLLOWERS_ONLY });
    }
    // If not following, only show PUBLIC

    const playlists = await db.playlist.findMany({
      where: {
        userId: targetUserId,
        OR: currentUser?.id === targetUserId
          ? undefined
          : visibilityFilter.length > 0
          ? visibilityFilter
          : [{ visibility: PlaylistVisibility.PUBLIC }],
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
    });

    return NextResponse.json({ playlists });
  } catch (error) {
    console.error("Error fetching user playlists:", error);
    return NextResponse.json(
      { error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}

