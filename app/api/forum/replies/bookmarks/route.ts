import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * GET - Get user's bookmarked replies
 */
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      db.forumReplyBookmark.findMany({
        where: { userId: user.id },
        include: {
          reply: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
              post: {
                select: {
                  id: true,
                  slug: true,
                  title: true,
                },
              },
              reactions: {
                select: {
                  id: true,
                  reactionType: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.forumReplyBookmark.count({
        where: { userId: user.id },
      }),
    ]);

    // Format replies
    const replies = bookmarks.map((bookmark) => {
      const reply = bookmark.reply;
      const reactions = reply.reactions || [];
      const upvotes = reactions.filter((r) => r.reactionType === "upvote").length;
      const downvotes = reactions.filter((r) => r.reactionType === "downvote").length;
      const score = upvotes - downvotes;

      return {
        id: reply.id,
        content: reply.content,
        score,
        likes: score,
        author: {
          id: reply.user.id,
          username: reply.user.username,
          displayName: reply.user.username || reply.user.displayName,
          avatarUrl: reply.user.avatarUrl,
        },
        post: {
          id: reply.post.id,
          slug: reply.post.slug,
          title: reply.post.title,
        },
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        bookmarkedAt: bookmark.createdAt,
      };
    });

    return NextResponse.json({
      replies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching reply bookmarks:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved comments" },
      { status: 500 }
    );
  }
}

