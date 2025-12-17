import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get forum statistics for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
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

    const userId = targetUser.id;

    // Get forum statistics
    const [postCount, replyCount, totalReactions, recentPosts, recentReplies] = await Promise.all([
      db.forumPost.count({
        where: {
          userId,
          isHidden: false,
        },
      }),
      db.forumReply.count({
        where: {
          userId,
          isHidden: false,
        },
      }),
      db.forumPostReaction.count({
        where: {
          post: {
            userId,
            isHidden: false,
          },
        },
      }) + db.forumReplyReaction.count({
        where: {
          reply: {
            userId,
            isHidden: false,
          },
        },
      }),
      db.forumPost.findMany({
        where: {
          userId,
          isHidden: false,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          slug: true,
          title: true,
          createdAt: true,
          views: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true,
            },
          },
          _count: {
            select: {
              replies: true,
              reactions: true,
            },
          },
        },
      }),
      db.forumReply.findMany({
        where: {
          userId,
          isHidden: false,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          createdAt: true,
          post: {
            select: {
              id: true,
              slug: true,
              title: true,
            },
          },
          _count: {
            select: {
              reactions: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        postCount,
        replyCount,
        totalReactions,
      },
      recentPosts: recentPosts.map(post => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        createdAt: post.createdAt,
        views: post.views,
        replyCount: post._count.replies,
        reactionCount: post._count.reactions,
        category: post.category,
      })),
      recentReplies: recentReplies.map(reply => ({
        id: reply.id,
        createdAt: reply.createdAt,
        postId: reply.post.id,
        postSlug: reply.post.slug,
        postTitle: reply.post.title,
        reactionCount: reply._count.reactions,
      })),
    });
  } catch (error) {
    console.error("Error fetching forum stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch forum stats" },
      { status: 500 }
    );
  }
}

