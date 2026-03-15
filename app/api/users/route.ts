import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

type SortOption = "newest" | "followers" | "lists" | "name";
type FilterOption = "all" | "hasLists" | "following" | "favorites";

// GET - Get all users with pagination, sort, and filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "24", 10);
    const search = searchParams.get("search") || "";
    const sort = (searchParams.get("sort") || "newest") as SortOption;
    const filter = (searchParams.get("filter") || "all") as FilterOption;
    const skip = (page - 1) * limit;

    // Get current user if authenticated (to check follow status and apply filter/sort)
    const { userId: clerkUserId } = await auth();
    let currentUserId: string | undefined;
    if (clerkUserId) {
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
      currentUserId = user?.id;
    }

    // Get follow status and who current user follows (for filter=following)
    let followingIds: string[] = [];
    let bookmarkedMemberIds: string[] = [];
    if (currentUserId) {
      const [follows, bookmarks] = await Promise.all([
        db.follow.findMany({
          where: { followerId: currentUserId },
          select: { followingId: true },
        }),
        db.favoriteMember.findMany({
          where: { bookmarkedById: currentUserId },
          select: { memberId: true },
        }),
      ]);
      followingIds = follows.map((f) => f.followingId);
      bookmarkedMemberIds = bookmarks.map((b) => b.memberId);
    }

    // Bulk counts: followers, following, public lists/playlists, watched, liked movies, reviews
    const [
      followersGroup,
      followingGroup,
      publicListsGroup,
      publicPlaylistsGroup,
      viewingLogGroup,
      favoritesGroup,
      reviewsGroup,
    ] = await Promise.all([
      db.follow.groupBy({ by: ["followingId"], _count: { id: true } }),
      db.follow.groupBy({ by: ["followerId"], _count: { id: true } }),
      db.list.groupBy({
        by: ["userId"],
        where: { visibility: "PUBLIC" },
        _count: { id: true },
      }),
      db.playlist.groupBy({
        by: ["userId"],
        where: { visibility: "PUBLIC" },
        _count: { id: true },
      }),
      db.viewingLog.groupBy({ by: ["userId"], _count: { id: true } }),
      db.favorite.groupBy({ by: ["userId", "mediaType"], _count: { id: true } }),
      db.review.groupBy({ by: ["userId"], _count: { id: true } }),
    ]);

    const followersCountMap = new Map(followersGroup.map((r) => [r.followingId, r._count.id]));
    const followingCountMap = new Map(followingGroup.map((r) => [r.followerId, r._count.id]));
    const publicListsCountMap = new Map(publicListsGroup.map((r) => [r.userId, r._count.id]));
    const publicPlaylistsCountMap = new Map(publicPlaylistsGroup.map((r) => [r.userId, r._count.id]));
    const watchedCountMap = new Map(viewingLogGroup.map((r) => [r.userId, r._count.id]));
    const likedMoviesCountMap = new Map(
      favoritesGroup
        .filter((r) => r.mediaType === "movie")
        .map((r) => [r.userId, r._count.id])
    );
    const reviewsCountMap = new Map(reviewsGroup.map((r) => [r.userId, r._count.id]));

    const getPublicListsCount = (userId: string) =>
      (publicListsCountMap.get(userId) ?? 0) + (publicPlaylistsCountMap.get(userId) ?? 0);

    // Get all users (we'll filter and sort in memory)
    const allUsers = await db.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bannerUrl: true,
        bannerGradientId: true,
        bio: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter by search (case-insensitive)
    let filteredUsers = allUsers;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = allUsers.filter(
        (user) =>
          user.username?.toLowerCase().includes(searchLower) ||
          user.displayName?.toLowerCase().includes(searchLower)
      );
    }

    // Filter: hasLists = only users with at least one public list or playlist
    if (filter === "hasLists") {
      filteredUsers = filteredUsers.filter((u) => getPublicListsCount(u.id) > 0);
    } else if (filter === "following" && currentUserId) {
      filteredUsers = filteredUsers.filter((u) => followingIds.includes(u.id));
    } else if (filter === "favorites" && currentUserId) {
      filteredUsers = filteredUsers.filter((u) => bookmarkedMemberIds.includes(u.id));
    }

    // Sort
    if (sort === "followers") {
      filteredUsers = [...filteredUsers].sort(
        (a, b) => (followersCountMap.get(b.id) ?? 0) - (followersCountMap.get(a.id) ?? 0)
      );
    } else if (sort === "lists") {
      filteredUsers = [...filteredUsers].sort(
        (a, b) => getPublicListsCount(b.id) - getPublicListsCount(a.id)
      );
    } else if (sort === "name") {
      filteredUsers = [...filteredUsers].sort((a, b) => {
        const na = (a.username || a.displayName || "").toLowerCase();
        const nb = (b.username || b.displayName || "").toLowerCase();
        return na.localeCompare(nb);
      });
    }
    // "newest" keeps existing order (createdAt desc)

    const total = filteredUsers.length;
    const users = filteredUsers.slice(skip, skip + limit);

    // Build response with counts; for current user include allListsCount (all lists + playlists)
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const followersCount = followersCountMap.get(user.id) ?? 0;
        const followingCount = followingCountMap.get(user.id) ?? 0;
        const listsCount = getPublicListsCount(user.id);
        const watchedCount = watchedCountMap.get(user.id) ?? 0;
        const likedCount = likedMoviesCountMap.get(user.id) ?? 0;
        const reviewsCount = reviewsCountMap.get(user.id) ?? 0;

        let allListsCount: number | undefined;
        if (currentUserId && user.id === currentUserId) {
          const [allListCount, allPlaylistCount] = await Promise.all([
            db.list.count({ where: { userId: user.id } }),
            db.playlist.count({ where: { userId: user.id } }),
          ]);
          allListsCount = allListCount + allPlaylistCount;
        }

        return {
          ...user,
          followersCount,
          followingCount,
          listsCount,
          watchedCount,
          likedCount,
          reviewsCount,
          ...(allListsCount !== undefined && { allListsCount }),
          isFollowing: followingIds.includes(user.id),
          isBookmarked: bookmarkedMemberIds.includes(user.id),
        };
      })
    );

    return NextResponse.json({
      users: usersWithCounts,
      bookmarkedMemberIds: bookmarkedMemberIds,
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

