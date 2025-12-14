import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

// GET - Fetch a single forum post with replies
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { postId } = await params;

    const post = await db.forumPost.findUnique({
      where: { id: postId },
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
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            reactions: {
              select: {
                id: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        reactions: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Increment view count (fire and forget)
    db.forumPost.update({
      where: { id: postId },
      data: { views: { increment: 1 } },
    }).catch(console.error);

    // Format replies with nested structure
    const topLevelReplies = post.replies.filter((reply) => !reply.parentReplyId);
    const nestedReplies = post.replies.filter((reply) => reply.parentReplyId);

    type ReplyWithUser = typeof post.replies[0];
    
    interface FormattedReply {
      id: string;
      content: string;
      likes: number;
      author: {
        id: string;
        username: string | null;
        displayName: string | null;
        avatarUrl: string | null;
      };
      parentReplyId: string | null;
      createdAt: Date;
      updatedAt: Date;
      replies: FormattedReply[];
    }
    
    const formatReplies = (replyList: ReplyWithUser[]): FormattedReply[] => {
      return replyList.map((reply: ReplyWithUser) => {
        const children = nestedReplies.filter(
          (r: ReplyWithUser) => r.parentReplyId === reply.id
        );
        return {
          id: reply.id,
          content: reply.content,
          likes: (reply as any).reactions?.length || 0, // Use actual reaction count
          author: {
            id: reply.user.id,
            username: reply.user.username,
            displayName: reply.user.displayName || reply.user.username,
            avatarUrl: reply.user.avatarUrl,
          },
          parentReplyId: reply.parentReplyId,
          createdAt: reply.createdAt,
          updatedAt: reply.updatedAt,
          replies: formatReplies(children),
        };
      });
    };

    return NextResponse.json({
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        tags: post.tags,
        tmdbId: post.tmdbId,
        mediaType: post.mediaType,
        category: post.category ? {
          id: post.category.id,
          name: post.category.name,
          slug: post.category.slug,
          color: post.category.color,
        } : null,
        views: post.views + 1, // Include the increment
        likes: post.reactions.length, // Use actual reaction count
        replyCount: post.replies.length,
        author: {
          id: post.user.id,
          username: post.user.username,
          displayName: post.user.displayName || post.user.username,
          avatarUrl: post.user.avatarUrl,
        },
        replies: formatReplies(topLevelReplies),
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching forum post:", error);
    return NextResponse.json(
      { error: "Failed to fetch forum post" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a forum post (only by author)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
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

    const { postId } = await params;

    const post = await db.forumPost.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.userId !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own posts" },
        { status: 403 }
      );
    }

    await db.forumPost.delete({
      where: { id: postId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting forum post:", error);
    return NextResponse.json(
      { error: "Failed to delete forum post" },
      { status: 500 }
    );
  }
}

