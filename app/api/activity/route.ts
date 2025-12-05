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

    const followingIds = following.map((f: { followingId: string }) => f.followingId);
    
    // Include current user's own activities
    const userIds = [user.id, ...followingIds];

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type"); // Filter by activity type
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const sortBy = searchParams.get("sortBy") || "createdAt"; // Sort field: "createdAt" (default)
    const sortOrder = searchParams.get("sortOrder") || "desc"; // Sort order: "asc" or "desc"
    const startDate = searchParams.get("startDate"); // Date range start (ISO string)
    const endDate = searchParams.get("endDate"); // Date range end (ISO string)
    const search = searchParams.get("search"); // Search query
    const groupBy = searchParams.get("groupBy"); // Group by: "day", "week", "month", or null

    // Build where clause
    const where: {
      userId: { in: string[] };
      type?: "LOGGED_FILM" | "RATED_FILM" | "REVIEWED_FILM" | "LIKED_FILM" | "CREATED_LIST" | "CREATED_PLAYLIST" | "FOLLOWED_USER";
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
      OR?: Array<{
        title?: { contains: string; mode?: "insensitive" };
        listName?: { contains: string; mode?: "insensitive" };
      }>;
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

    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Search functionality (search in title and listName)
    if (search && search.trim().length > 0) {
      // MongoDB doesn't support case-insensitive search directly, so we'll filter in memory
      // But we still need to add the filter for the query structure
      where.OR = [
        { title: { contains: search.trim() } },
        { listName: { contains: search.trim() } },
      ];
    }

    // Build orderBy clause
    const orderBy: { [key: string]: "asc" | "desc" } = {};
    if (sortBy === "createdAt") {
      orderBy.createdAt = sortOrder === "asc" ? "asc" : "desc";
    }

    // Fetch activities
    let activities = await db.activity.findMany({
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
      orderBy,
      take: limit * 2, // Fetch more for grouping/search filtering
    });

    // Apply case-insensitive search filtering in memory (MongoDB limitation)
    if (search && search.trim().length > 0) {
      const searchLower = search.trim().toLowerCase();
      activities = activities.filter(
        (activity) =>
          (activity.title?.toLowerCase().includes(searchLower)) ||
          (activity.listName?.toLowerCase().includes(searchLower)) ||
          (activity.user.displayName?.toLowerCase().includes(searchLower)) ||
          (activity.user.username?.toLowerCase().includes(searchLower))
      );
    }

    // Apply limit after filtering
    activities = activities.slice(0, limit);

    // Group activities if requested
    let groupedActivities: Record<string, typeof activities> | null = null;
    if (groupBy && (groupBy === "day" || groupBy === "week" || groupBy === "month")) {
      groupedActivities = {};
      activities.forEach((activity) => {
        const date = new Date(activity.createdAt);
        let key: string;

        if (groupBy === "day") {
          key = date.toISOString().split("T")[0]; // YYYY-MM-DD
        } else if (groupBy === "week") {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
          key = `Week of ${weekStart.toISOString().split("T")[0]}`;
        } else {
          // month
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
        }

        if (!groupedActivities![key]) {
          groupedActivities![key] = [];
        }
        groupedActivities![key].push(activity);
      });
    }

    return NextResponse.json({
      activities: groupedActivities ? Object.values(groupedActivities).flat() : activities,
      grouped: groupedActivities,
      total: activities.length,
    });
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

    // Get user's privacy settings
    const userWithSettings = await db.user.findUnique({
      where: { id: user.id },
      select: {
        activityVisibility: true,
        showRatingsInActivity: true,
        showReviewsInActivity: true,
        showListsInActivity: true,
        showPlaylistsInActivity: true,
        showWatchedInActivity: true,
        showLikedInActivity: true,
        showFollowedInActivity: true,
      },
    });

    // Determine if this activity type should be visible based on user settings
    let shouldCreateActivity = true;
    if (userWithSettings) {
      switch (type) {
        case "RATED_FILM":
          shouldCreateActivity = userWithSettings.showRatingsInActivity;
          break;
        case "REVIEWED_FILM":
          shouldCreateActivity = userWithSettings.showReviewsInActivity;
          break;
        case "LOGGED_FILM":
          shouldCreateActivity = userWithSettings.showWatchedInActivity;
          break;
        case "LIKED_FILM":
          shouldCreateActivity = userWithSettings.showLikedInActivity;
          break;
        case "CREATED_LIST":
          shouldCreateActivity = userWithSettings.showListsInActivity;
          break;
        case "CREATED_PLAYLIST":
          shouldCreateActivity = userWithSettings.showPlaylistsInActivity;
          break;
        case "FOLLOWED_USER":
          shouldCreateActivity = userWithSettings.showFollowedInActivity;
          break;
      }
    }

    // Only create activity if user's settings allow it
    if (!shouldCreateActivity) {
      return NextResponse.json({
        success: true,
        activity: null,
        message: "Activity not created due to privacy settings",
      });
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
        visibility: userWithSettings?.activityVisibility || "PUBLIC",
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

