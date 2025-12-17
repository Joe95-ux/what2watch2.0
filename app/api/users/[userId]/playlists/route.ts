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

    const { userId: identifier } = await params;

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

    const targetUserId = targetUser.id;

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

    // Build visibility filter - support both visibility enum and isPublic boolean
    // If current user is the owner, show all playlists
    const whereClause: {
      userId: string;
      OR?: Array<{ visibility: PlaylistVisibility } | { isPublic: true }>;
    } =
      currentUser && currentUser.id === targetUserId
        ? {
            userId: targetUserId,
            // Show all playlists for own profile - no visibility filter needed
          }
        : {
            userId: targetUserId,
            // For other users, filter by visibility
            OR: (() => {
              const conditions: Array<
                { visibility: PlaylistVisibility } | { isPublic: true }
              > = [
                { visibility: PlaylistVisibility.PUBLIC },
                { isPublic: true }, // Support legacy isPublic field
              ];

              if (isFollowing) {
                // If following, also show FOLLOWERS_ONLY
                conditions.push({ visibility: PlaylistVisibility.FOLLOWERS_ONLY });
              }

              return conditions;
            })(),
          };

    const playlists = await db.playlist.findMany({
      where: whereClause,
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
          take: 3, // Get up to 3 items for poster grid
          orderBy: { order: "asc" },
          select: {
            order: true,
            posterPath: true,
          },
        },
        youtubeItems: {
          take: 3, // Get up to 3 YouTube items for poster grid
          orderBy: { order: "asc" },
          select: {
            order: true,
            thumbnail: true,
          },
        },
        _count: {
          select: { 
            items: true,
            youtubeItems: true,
          },
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

