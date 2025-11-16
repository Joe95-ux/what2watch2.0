import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch activity feed (activities from users you follow)
export async function GET(request: NextRequest): Promise<NextResponse<{ activities: unknown[] } | { error: string }>> {
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

    const followingIds = following.map((f) => f.followingId);
    
    // Include current user's own activities
    const userIds = [user.id, ...followingIds];

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type"); // Filter by activity type
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Build where clause
    const where: {
      userId: { in: string[] };
      type?: "LOGGED_FILM" | "RATED_FILM" | "REVIEWED_FILM" | "LIKED_FILM" | "CREATED_LIST" | "CREATED_PLAYLIST" | "FOLLOWED_USER";
    } = {
      userId: { in: userIds },
    };

    if (typeParam && [
      "LOGGED_FILM",
      "RATED_FILM",
      "REVIEWED_FILM",
      "LIKED_FILM",
      "CREATED_LIST",
      "CREATED_PLAYLIST",
      "FOLLOWED_USER"
    ].includes(typeParam)) {
      where.type = typeParam as "LOGGED_FILM" | "RATED_FILM" | "REVIEWED_FILM" | "LIKED_FILM" | "CREATED_LIST" | "CREATED_PLAYLIST" | "FOLLOWED_USER";
    }

    // Fetch activities
    const activities = await db.activity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        followedUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Activity feed API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch activity feed";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Create an activity
export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean; activity?: unknown } | { error: string }>> {
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

    const body = await request.json();
    const { type, tmdbId, mediaType, title, posterPath, listId, listName, followedUserId, rating, metadata } = body;

    if (!type) {
      return NextResponse.json(
        { error: "Missing required field: type" },
        { status: 400 }
      );
    }

    const activity = await db.activity.create({
      data: {
        userId: user.id,
        type,
        tmdbId: tmdbId || null,
        mediaType: mediaType || null,
        title: title || null,
        posterPath: posterPath || null,
        listId: listId || null,
        listName: listName || null,
        followedUserId: followedUserId || null,
        rating: rating || null,
        metadata: metadata || null,
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
        followedUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error("Create activity API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create activity";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

