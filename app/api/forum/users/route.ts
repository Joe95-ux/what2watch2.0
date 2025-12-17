import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Fetch forum users with statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "30", 10);
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "reputation";
    const order = searchParams.get("order") || "desc";

    const skip = (page - 1) * limit;

    // Build where clause for search
    const where: any = {
      OR: [
        { forumPosts: { some: {} } },
        { forumReplies: { some: {} } },
      ],
    };

    if (search) {
      // Filter will be applied after fetching to handle case-insensitivity
      where.AND = [
        {
          OR: [
            { username: { contains: search } },
            { displayName: { contains: search } },
          ],
        },
      ];
    }

    // First, get user IDs that match the search and have forum activity
    const matchingUsers = await db.user.findMany({
      where,
      select: { id: true },
    });

    const userIds = matchingUsers.map(u => u.id);

    if (userIds.length === 0) {
      return NextResponse.json({
        users: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Fetch users with aggregated stats using counts
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            forumPosts: true,
            forumReplies: true,
          },
        },
      },
    });

    // Get post and reply scores separately for efficiency
    const userPostScores = await db.forumPost.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _sum: { score: true },
      _max: { updatedAt: true },
    });

    const userReplyScores = await db.forumReply.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _sum: { score: true },
      _max: { updatedAt: true },
    });

    // Create maps for quick lookup
    const postScoreMap = new Map(userPostScores.map(p => [p.userId, p._sum.score || 0]));
    const postActivityMap = new Map(userPostScores.map(p => [p.userId, p._max.updatedAt || null]));
    const replyScoreMap = new Map(userReplyScores.map(r => [r.userId, r._sum.score || 0]));
    const replyActivityMap = new Map(userReplyScores.map(r => [r.userId, r._max.updatedAt || null]));

    // Filter by search query (case-insensitive) if needed
    let filteredUsers = users;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = users.filter(user => 
        (user.username && user.username.toLowerCase().includes(searchLower)) ||
        (user.displayName && user.displayName.toLowerCase().includes(searchLower))
      );
    }

    // Update userIds to only include filtered users
    const filteredUserIds = filteredUsers.map(u => u.id);

    // Re-fetch scores only for filtered users
    const filteredPostScores = userPostScores.filter(p => filteredUserIds.includes(p.userId));
    const filteredReplyScores = userReplyScores.filter(r => filteredUserIds.includes(r.userId));

    // Update maps with filtered data
    const filteredPostScoreMap = new Map(filteredPostScores.map(p => [p.userId, p._sum.score || 0]));
    const filteredPostActivityMap = new Map(filteredPostScores.map(p => [p.userId, p._max.updatedAt || null]));
    const filteredReplyScoreMap = new Map(filteredReplyScores.map(r => [r.userId, r._sum.score || 0]));
    const filteredReplyActivityMap = new Map(filteredReplyScores.map(r => [r.userId, r._max.updatedAt || null]));

    // Calculate statistics for each user
    const usersWithStats = filteredUsers.map((user) => {
      const postCount = user._count.forumPosts;
      const replyCount = user._count.forumReplies;
      
      // Calculate reputation: sum of all post scores + reply scores
      const postScores = filteredPostScoreMap.get(user.id) || 0;
      const replyScores = filteredReplyScoreMap.get(user.id) || 0;
      const reputation = postScores + replyScores;

      // Find last activity: max of last post/reply updatedAt
      const lastPostActivity = filteredPostActivityMap.get(user.id);
      const lastReplyActivity = filteredReplyActivityMap.get(user.id);
      const lastActivity = lastPostActivity && lastReplyActivity
        ? new Date(Math.max(new Date(lastPostActivity).getTime(), new Date(lastReplyActivity).getTime()))
        : lastPostActivity
        ? new Date(lastPostActivity)
        : lastReplyActivity
        ? new Date(lastReplyActivity)
        : user.createdAt;

      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        joinDate: user.createdAt,
        postCount,
        replyCount,
        reputation,
        lastActivity,
      };
    });

    // Sort users
    let sortedUsers = usersWithStats;
    if (sortBy === "reputation") {
      sortedUsers = [...usersWithStats].sort((a, b) => 
        order === "desc" ? b.reputation - a.reputation : a.reputation - b.reputation
      );
    } else if (sortBy === "posts") {
      sortedUsers = [...usersWithStats].sort((a, b) => 
        order === "desc" ? b.postCount - a.postCount : a.postCount - b.postCount
      );
    } else if (sortBy === "replies") {
      sortedUsers = [...usersWithStats].sort((a, b) => 
        order === "desc" ? b.replyCount - a.replyCount : a.replyCount - b.replyCount
      );
    } else if (sortBy === "joinDate") {
      sortedUsers = [...usersWithStats].sort((a, b) => {
        const dateA = new Date(a.joinDate).getTime();
        const dateB = new Date(b.joinDate).getTime();
        return order === "desc" ? dateB - dateA : dateA - dateB;
      });
    } else if (sortBy === "lastActive") {
      sortedUsers = [...usersWithStats].sort((a, b) => {
        const dateA = new Date(a.lastActivity).getTime();
        const dateB = new Date(b.lastActivity).getTime();
        return order === "desc" ? dateB - dateA : dateA - dateB;
      });
    }

    // Apply pagination after sorting
    const paginatedUsers = sortedUsers.slice(skip, skip + limit);

    // Get total count for pagination
    const total = sortedUsers.length;

    return NextResponse.json({
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching forum users:", error);
    return NextResponse.json(
      { error: "Failed to fetch forum users" },
      { status: 500 }
    );
  }
}

