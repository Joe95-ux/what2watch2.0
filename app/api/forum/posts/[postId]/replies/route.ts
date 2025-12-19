import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { moderateContent } from "@/lib/moderation";
import { sanitizeContent } from "@/lib/server-html-sanitizer";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

// GET - Fetch replies for a post
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { postId } = await params;

    // Check if postId is an ObjectId (24 hex characters) or a slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(postId);
    
    // Find post by id or slug to get the actual post ID
    const post = isObjectId
      ? await db.forumPost.findUnique({
          where: { id: postId },
          select: { id: true },
        })
      : await db.forumPost.findFirst({
          where: { slug: postId },
          select: { id: true },
        });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const replies = await db.forumReply.findMany({
      where: { postId: post.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Format replies with nested structure
    const topLevelReplies = replies.filter((reply) => !reply.parentReplyId);
    const nestedReplies = replies.filter((reply) => reply.parentReplyId);

    type ReplyWithUser = typeof replies[0];
    
    interface FormattedReply {
      id: string;
      content: string;
      score: number;
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
      return replyList.map((reply) => {
        const children = nestedReplies.filter(
          (r) => r.parentReplyId === reply.id
        );
        return {
          id: reply.id,
          content: reply.content,
          score: reply.score,
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
      replies: formatReplies(topLevelReplies),
    });
  } catch (error) {
    console.error("Error fetching forum replies:", error);
    return NextResponse.json(
      { error: "Failed to fetch forum replies" },
      { status: 500 }
    );
  }
}

// POST - Create a reply to a post
export async function POST(
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

    // Rate limiting - 20 replies per hour
    const rateLimitResult = checkRateLimit(
      user.id,
      20,
      60 * 60 * 1000 // 1 hour
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.error || "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "20",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    const { postId } = await params;
    const body = await request.json();
    const { content, parentReplyId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: "Content must be 5,000 characters or less" },
        { status: 400 }
      );
    }

    // Server-side content moderation and sanitization
    const contentModeration = moderateContent(content.trim(), {
      minLength: 1,
      maxLength: 5000,
      allowProfanity: false,
      sanitizeHtml: true,
    });

    if (!contentModeration.allowed) {
      return NextResponse.json(
        { error: contentModeration.error || "Content contains inappropriate content" },
        { status: 400 }
      );
    }

    // Sanitize HTML on server-side
    const sanitizedContent = sanitizeContent(contentModeration.sanitized || content.trim());

    // Check if postId is an ObjectId (24 hex characters) or a slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(postId);
    
    // Verify post exists and get actual post ID
    const post = isObjectId
      ? await db.forumPost.findUnique({
          where: { id: postId },
          select: { id: true },
        })
      : await db.forumPost.findFirst({
          where: { slug: postId },
          select: { id: true },
        });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const actualPostId = post.id;

    // If parentReplyId is provided, verify it exists and belongs to the same post
    if (parentReplyId) {
      const parentReply = await db.forumReply.findUnique({
        where: { id: parentReplyId },
        select: { postId: true },
      });

      if (!parentReply) {
        return NextResponse.json(
          { error: "Parent reply not found" },
          { status: 404 }
        );
      }

      if (parentReply.postId !== actualPostId) {
        return NextResponse.json(
          { error: "Parent reply does not belong to this post" },
          { status: 400 }
        );
      }
    }

    const reply = await db.forumReply.create({
      data: {
        userId: user.id,
        postId: actualPostId,
        content: sanitizedContent,
        parentReplyId: parentReplyId || null,
      },
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
            categoryId: true,
            tmdbId: true,
            mediaType: true,
          },
        },
      },
    });

    // Create activity for forum reply creation
    try {
      await db.activity.create({
        data: {
          userId: user.id,
          type: "CREATED_FORUM_REPLY",
          title: reply.post.title,
          metadata: {
            replyId: reply.id,
            postId: reply.postId,
            postSlug: reply.post.slug,
            parentReplyId: reply.parentReplyId,
            categoryId: reply.post.categoryId,
            tmdbId: reply.post.tmdbId,
            mediaType: reply.post.mediaType,
          },
        },
      });
    } catch (error) {
      // Silently fail - activity creation is not critical
      console.error("Failed to create activity for forum reply:", error);
    }

    // Create notifications for reply
    try {
      // Get post details
      const post = await db.forumPost.findUnique({
        where: { id: actualPostId },
        select: { userId: true, title: true },
      });

      if (!post) {
        throw new Error("Post not found");
      }

      const actorDisplayName = reply.user.displayName || reply.user.username || "Someone";
      const notificationsToCreate = [];

      // 1. Notify post author (if not the same user and not a reply to a reply)
      if (post.userId !== user.id && !parentReplyId) {
        notificationsToCreate.push({
          userId: post.userId,
          type: "NEW_REPLY",
          postId: actualPostId,
          replyId: reply.id,
          actorId: user.id,
          title: "New reply to your post",
          message: `${actorDisplayName} replied to "${post.title}"`,
        });
      }

      // 2. If replying to a reply, notify the parent reply author
      let parentReplyUserId: string | null = null;
      if (parentReplyId) {
        const parentReply = await db.forumReply.findUnique({
          where: { id: parentReplyId },
          select: { userId: true },
        });

        if (parentReply && parentReply.userId !== user.id) {
          parentReplyUserId = parentReply.userId;
          notificationsToCreate.push({
            userId: parentReply.userId,
            type: "REPLY_TO_REPLY",
            postId: actualPostId,
            replyId: reply.id,
            actorId: user.id,
            title: "Reply to your comment",
            message: `${actorDisplayName} replied to your comment`,
          });
        }
      }

      // 3. Notify all users subscribed to the post (except the author and parent reply author)
      const subscriptions = await db.forumPostSubscription.findMany({
        where: { postId: actualPostId },
        select: { userId: true },
      });

      const notifiedUserIds = new Set([
        user.id, // Don't notify the reply author
        ...(parentReplyUserId ? [parentReplyUserId] : []), // Don't notify parent reply author (already notified above)
        ...(post.userId !== user.id && !parentReplyId ? [post.userId] : []), // Don't notify post author if already notified
      ]);

      for (const subscription of subscriptions) {
        if (!notifiedUserIds.has(subscription.userId)) {
          notificationsToCreate.push({
            userId: subscription.userId,
            type: "POST_SUBSCRIPTION",
            postId: actualPostId,
            replyId: reply.id,
            actorId: user.id,
            title: "New reply to subscribed post",
            message: `${actorDisplayName} replied to "${post.title}"`,
          });
        }
      }

      // Create all notifications
      if (notificationsToCreate.length > 0) {
        await db.forumNotification.createMany({
          data: notificationsToCreate,
        });
      }
    } catch (error) {
      // Silently fail - notification creation is not critical
      console.error("Failed to create notifications for forum reply:", error);
    }

    return NextResponse.json({
      reply: {
        id: reply.id,
        content: reply.content,
        score: reply.score,
        author: {
          id: reply.user.id,
          username: reply.user.username,
          displayName: reply.user.displayName || reply.user.username,
          avatarUrl: reply.user.avatarUrl,
        },
        parentReplyId: reply.parentReplyId,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        replies: [],
      },
    });
  } catch (error) {
    console.error("Error creating forum reply:", error);
    return NextResponse.json(
      { error: "Failed to create forum reply" },
      { status: 500 }
    );
  }
}

