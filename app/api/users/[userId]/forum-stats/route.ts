import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertObjectId } from "@/lib/assert-objectId";

// GET - Get forum statistics for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: identifier } = await params;

    console.log("[API /users/[userId]/forum-stats] Backend received params:", {
      identifier,
      type: typeof identifier,
      isNull: identifier === null,
      isUndefined: identifier === undefined,
      isEmpty: identifier === "",
      trimmed: identifier?.trim(),
    });

    if (!identifier?.trim()) {
      console.log("[API /users/[userId]/forum-stats] Error: identifier is empty or invalid");
      return NextResponse.json(
        { error: "User identifier is required" },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim();
    console.log("[API /users/[userId]/forum-stats] Clean identifier:", cleanIdentifier);

    // 1. Try username first (safe)
    console.log("[API /users/[userId]/forum-stats] Attempting username lookup:", cleanIdentifier);
    let targetUser = await db.user.findFirst({
      where: { username: cleanIdentifier },
      select: { id: true },
    });

    console.log("[API /users/[userId]/forum-stats] Username lookup result:", targetUser ? { id: targetUser.id } : "not found");

    // 2. If not found, try ObjectId (safe)
    const validObjectId = assertObjectId(cleanIdentifier);
    console.log("[API /users/[userId]/forum-stats] Valid ObjectId?", validObjectId);
    if (!targetUser && validObjectId) {
      console.log("[API /users/[userId]/forum-stats] Attempting ObjectId lookup:", validObjectId);
      targetUser = await db.user.findUnique({
        where: { id: validObjectId },
        select: { id: true },
      });
      console.log("[API /users/[userId]/forum-stats] ObjectId lookup result:", targetUser ? { id: targetUser.id } : "not found");
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userId = targetUser.id;
    const [
      postCount,
      replyCount,
      postReactionsCount,
      replyReactionsCount,
      recentPosts,
      recentReplies,
    ] = await Promise.all([
      db.forumPost.count({
        where: { userId, isHidden: false },
      }),
      db.forumReply.count({
        where: { userId, isHidden: false },
      }),
      db.forumPostReaction.count({
        where: {
          post: {
            userId,
            isHidden: false,
          },
        },
      }),
      db.forumReplyReaction.count({
        where: {
          reply: {
            userId,
            isHidden: false,
          },
        },
      }),
      db.forumPost.findMany({
        where: { userId, isHidden: false },
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
        where: { userId, isHidden: false },
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
        totalReactions: postReactionsCount + replyReactionsCount,
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
