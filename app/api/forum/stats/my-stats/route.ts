import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

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

    const userId = user.id;

    // Fetch all stats in parallel
    const [
      postCount,
      replyCount,
      totalViews,
      totalScore,
      totalUpvotes,
      totalDownvotes,
      publishedCount,
      draftCount,
      archivedCount,
      scheduledCount,
      savedPostsCount,
      savedCommentsCount,
      totalRepliesReceived,
    ] = await Promise.all([
      // Total posts
      db.forumPost.count({
        where: { userId, isHidden: false },
      }),
      // Total replies
      db.forumReply.count({
        where: { userId, isHidden: false },
      }),
      // Total views on user's posts
      db.forumPost.aggregate({
        where: { userId, isHidden: false },
        _sum: { views: true },
      }),
      // Total score on user's posts
      db.forumPost.aggregate({
        where: { userId, isHidden: false },
        _sum: { score: true },
      }),
      // Total upvotes on user's posts
      db.forumPostReaction.count({
        where: {
          post: { userId, isHidden: false },
          reactionType: "upvote",
        },
      }),
      // Total downvotes on user's posts
      db.forumPostReaction.count({
        where: {
          post: { userId, isHidden: false },
          reactionType: "downvote",
        },
      }),
      // Published posts
      db.forumPost.count({
        where: {
          userId,
          isHidden: false,
          status: "PUBLIC",
          OR: [
            { scheduledAt: null },
            { scheduledAt: { lte: new Date() } },
          ],
        },
      }),
      // Draft/Private posts
      db.forumPost.count({
        where: {
          userId,
          isHidden: false,
          status: "PRIVATE",
        },
      }),
      // Archived posts
      db.forumPost.count({
        where: {
          userId,
          isHidden: false,
          status: "ARCHIVED",
        },
      }),
      // Scheduled posts
      db.forumPost.count({
        where: {
          userId,
          isHidden: false,
          status: "PUBLIC",
          scheduledAt: { gt: new Date() },
        },
      }),
      // Saved posts
      db.forumBookmark.count({
        where: { userId },
      }),
      // Saved comments
      db.forumReplyBookmark.count({
        where: { userId },
      }),
      // Total replies received on user's posts
      db.forumReply.count({
        where: {
          post: {
            userId,
            isHidden: false,
          },
          isHidden: false,
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        postCount,
        replyCount,
        totalViews: totalViews._sum.views || 0,
        totalScore: totalScore._sum.score || 0,
        totalUpvotes,
        totalDownvotes,
        totalReactions: totalUpvotes + totalDownvotes,
        publishedCount,
        draftCount,
        archivedCount,
        scheduledCount,
        savedPostsCount,
        savedCommentsCount,
        totalRepliesReceived,
      },
    });
  } catch (error) {
    console.error("Error fetching forum stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch forum stats" },
      { status: 500 }
    );
  }
}

