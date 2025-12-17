import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma, ActivityType } from "@prisma/client";

// GET - Get public activity feed for a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;
    const { userId: clerkUserId } = await auth();

    // Get target user
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
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

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if current user is viewing their own profile or is a follower
    let currentUserId: string | null = null;
    let isFollowing = false;
    let isOwnProfile = false;

    if (clerkUserId) {
      const currentUser = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });

      if (currentUser) {
        currentUserId = currentUser.id;
        isOwnProfile = currentUser.id === targetUserId;

        // Check if current user follows target user
        if (!isOwnProfile) {
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
      }
    }

    // Determine what activities can be viewed
    // If user is viewing their own profile, they can always see all activities
    const canViewAll = isOwnProfile;
    
    // Get the visibility setting, defaulting to "PUBLIC" if not set
    const visibility = targetUser.activityVisibility || "PUBLIC";
    
    // For other users, check visibility settings
    let canView = false;
    if (isOwnProfile) {
      canView = true; // Always allow viewing own profile
    } else {
      // Check if visibility allows viewing
      if (visibility === "PUBLIC") {
        canView = true;
      } else if (visibility === "FOLLOWERS_ONLY" && isFollowing) {
        canView = true;
      } else if (visibility === "PRIVATE") {
        canView = false;
      } else {
        // Default to public if visibility is not recognized
        canView = true;
      }
    }

    if (!canView) {
      return NextResponse.json({
        activities: [],
        grouped: null,
        total: 0,
        privacy: {
          visibility: visibility,
          isOwnProfile: false,
          canViewAll: false,
        },
        message: "This user's activity is private",
      });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const startDate = searchParams.get("startDate"); // Date range start (ISO string)
    const endDate = searchParams.get("endDate"); // Date range end (ISO string)
    const search = searchParams.get("search"); // Search query
    const groupBy = searchParams.get("groupBy"); // Group by: "day", "week", "month", or null

    // Build where clause
    const where: Prisma.ActivityWhereInput = {
      userId: targetUserId,
    };

    // Filter by activity type if provided
    if (typeParam && typeParam !== "all") {
      const validTypes: ActivityType[] = [
        "LOGGED_FILM",
        "RATED_FILM",
        "REVIEWED_FILM",
        "LIKED_FILM",
        "CREATED_LIST",
        "CREATED_PLAYLIST",
        "FOLLOWED_USER",
        "CREATED_FORUM_POST",
        "CREATED_FORUM_REPLY",
      ];
      if (validTypes.includes(typeParam as ActivityType)) {
        where.type = typeParam as ActivityType;
      }
    }

    // Apply privacy filters based on user settings
    if (!isOwnProfile) {
      // Filter out activities based on user's privacy settings
      const typeFilters: ActivityType[] = [];

      if (targetUser.showWatchedInActivity) {
        typeFilters.push("LOGGED_FILM");
      }
      if (targetUser.showRatingsInActivity) {
        typeFilters.push("RATED_FILM");
      }
      if (targetUser.showReviewsInActivity) {
        typeFilters.push("REVIEWED_FILM");
      }
      if (targetUser.showLikedInActivity) {
        typeFilters.push("LIKED_FILM");
      }
      if (targetUser.showListsInActivity) {
        typeFilters.push("CREATED_LIST");
      }
      if (targetUser.showPlaylistsInActivity) {
        typeFilters.push("CREATED_PLAYLIST");
      }
      if (targetUser.showFollowedInActivity) {
        typeFilters.push("FOLLOWED_USER");
      }

      // If a specific type is requested but it's not allowed, return empty
      if (typeParam && typeParam !== "all" && !typeFilters.includes(typeParam as ActivityType)) {
        return NextResponse.json({ activities: [] });
      }

      // If no specific type is requested, filter by allowed types
      if (!typeParam || typeParam === "all") {
        where.type = { in: typeFilters };
      }
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
        (activity: typeof activities[0]) =>
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
      activities.forEach((activity: typeof activities[0]) => {
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
      privacy: {
        visibility: visibility,
        isOwnProfile,
        canViewAll: canView, // Use canView instead of canViewAll - this allows viewing when visibility is PUBLIC
      },
    });
  } catch (error) {
    console.error("Error fetching user activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch user activity" },
      { status: 500 }
    );
  }
}

