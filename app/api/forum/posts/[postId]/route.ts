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

    // Check if postId is an ObjectId (24 hex characters) or a slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(postId);
    
    // Try slug first if not ObjectId, otherwise use id
    const includeOptions = {
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
        orderBy: { createdAt: "asc" as const },
      },
      reactions: {
        select: {
          id: true,
          reactionType: true,
        },
      },
    };

    const post = isObjectId
      ? await db.forumPost.findUnique({
          where: { id: postId },
          include: includeOptions,
        })
      : await db.forumPost.findFirst({
          where: { slug: postId },
          include: includeOptions,
        });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Increment view count (fire and forget)
    db.forumPost.update({
      where: { id: post.id },
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
          likes: reply.reactions?.length || 0,
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
          icon: post.category.icon,
        } : null,
        views: post.views + 1, // Include the increment
        score: post.score, // Use stored score
        replyCount: post.replies.length,
        slug: post.slug,
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

// PATCH - Update a forum post (only by author)
export async function PATCH(
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
    const body = await request.json();
    const { title, content, tags, categoryId, scheduledAt } = body;

    // Check if postId is an ObjectId or slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(postId);
    
    let post;
    if (isObjectId) {
      post = await db.forumPost.findUnique({
        where: { id: postId },
        select: { id: true, userId: true, title: true },
      });
    } else {
      post = await db.forumPost.findFirst({
        where: { slug: postId },
        select: { id: true, userId: true, title: true },
      });
    }

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.userId !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own posts" },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Process tags
    const validTags = tags
      ? (Array.isArray(tags) ? tags : tags.split(","))
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag.length > 0)
          .slice(0, 10)
      : [];

    // Validate category if provided
    if (categoryId) {
      const category = await db.forumCategory.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400 }
        );
      }
    }

    // Generate new slug if title changed
    let slug = post.title === title.trim() ? undefined : undefined;
    if (post.title !== title.trim()) {
      const { generateUniqueForumPostSlug } = await import("@/lib/forum-slug");
      slug = await generateUniqueForumPostSlug(title.trim(), post.id);
    }

    // Parse scheduledAt if provided
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    if (scheduledDate && scheduledDate < new Date()) {
      return NextResponse.json(
        { error: "Scheduled date must be in the future" },
        { status: 400 }
      );
    }

    const updateData: any = {
      title: title.trim(),
      content: content.trim(),
      tags: validTags,
      categoryId: categoryId || null,
      ...(scheduledDate && { scheduledAt: scheduledDate }),
    };

    if (slug) {
      updateData.slug = slug;
    }

    const updatedPost = await db.forumPost.update({
      where: { id: post.id },
      data: updateData,
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
      },
    });

    return NextResponse.json({ post: updatedPost });
  } catch (error) {
    console.error("Error updating forum post:", error);
    return NextResponse.json(
      { error: "Failed to update forum post" },
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

    // Check if postId is an ObjectId or slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(postId);
    
    let post;
    if (isObjectId) {
      post = await db.forumPost.findUnique({
        where: { id: postId },
        select: { id: true, userId: true },
      });
    } else {
      post = await db.forumPost.findFirst({
        where: { slug: postId },
        select: { id: true, userId: true },
      });
    }

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
      where: { id: post.id },
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

