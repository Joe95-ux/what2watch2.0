import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * GET - Get user's bookmarked posts
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
      db.forumBookmark.findMany({
        where: { userId: user.id },
        include: {
          post: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  color: true,
                  icon: true,
                },
              },
              replies: {
                select: { id: true },
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
      db.forumBookmark.count({
        where: { userId: user.id },
      }),
    ]);

    // Format posts similar to the main posts API
    const posts = bookmarks.map((bookmark) => {
      const post = bookmark.post;
      const reactions = post.reactions || [];
      const upvotes = reactions.filter((r) => r.reactionType === "upvote").length;
      const downvotes = reactions.filter((r) => r.reactionType === "downvote").length;
      const score = upvotes - downvotes;

      return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        content: post.content,
        tags: post.tags,
        metadata: post.metadata,
        tmdbId: post.tmdbId,
        mediaType: post.mediaType,
        views: post.views,
        score,
        replyCount: post.replies?.length || 0,
        category: post.category,
        author: {
          id: post.user.id,
          username: post.user.username,
          displayName: post.user.displayName || post.user.username,
          avatarUrl: post.user.avatarUrl,
        },
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        bookmarkedAt: bookmark.createdAt,
      };
    });

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
      { status: 500 }
    );
  }
}

