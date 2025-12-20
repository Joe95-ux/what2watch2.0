import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { savePostRevision } from "@/lib/services/forum-post-history.service";
import { moderateContent } from "@/lib/moderation";
import { sanitizeTitle, sanitizeContent } from "@/lib/server-html-sanitizer";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

/**
 * POST - Revert a post to a specific revision
 */
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

    const { postId } = await params;
    const body = await request.json();
    const { revisionId } = body;

    if (!revisionId) {
      return NextResponse.json(
        { error: "Revision ID is required" },
        { status: 400 }
      );
    }

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

    // Only post author can revert
    if (post.userId !== user.id) {
      return NextResponse.json(
        { error: "You can only revert your own posts" },
        { status: 403 }
      );
    }

    // Get the revision
    const revision = await db.forumPostRevision.findUnique({
      where: { id: revisionId },
      select: {
        id: true,
        postId: true,
        title: true,
        content: true,
        tags: true,
        categoryId: true,
        metadata: true,
      },
    });

    if (!revision) {
      return NextResponse.json(
        { error: "Revision not found" },
        { status: 404 }
      );
    }

    if (revision.postId !== post.id) {
      return NextResponse.json(
        { error: "Revision does not belong to this post" },
        { status: 400 }
      );
    }

    // Save current state as a revision before reverting
    const currentPost = await db.forumPost.findUnique({
      where: { id: post.id },
      select: {
        title: true,
        content: true,
        tags: true,
        categoryId: true,
        metadata: true,
      },
    });

    if (currentPost) {
      await savePostRevision(
        post.id,
        {
          title: currentPost.title,
          content: currentPost.content,
          tags: currentPost.tags,
          categoryId: currentPost.categoryId,
          metadata: currentPost.metadata as Record<string, any> | null,
        },
        user.id
      );
    }

    // Validate and sanitize the revision data
    const titleModeration = moderateContent(revision.title, {
      minLength: 1,
      maxLength: 200,
      allowProfanity: false,
      sanitizeHtml: true,
    });

    if (!titleModeration.allowed) {
      return NextResponse.json(
        { error: titleModeration.error || "Title contains inappropriate content" },
        { status: 400 }
      );
    }

    const contentModeration = moderateContent(revision.content, {
      minLength: 1,
      maxLength: 10000,
      allowProfanity: false,
      sanitizeHtml: true,
    });

    if (!contentModeration.allowed) {
      return NextResponse.json(
        { error: contentModeration.error || "Content contains inappropriate content" },
        { status: 400 }
      );
    }

    const sanitizedTitle = sanitizeTitle(titleModeration.sanitized || revision.title);
    const sanitizedContent = sanitizeContent(contentModeration.sanitized || revision.content);

    // Validate category if provided
    if (revision.categoryId) {
      const category = await db.forumCategory.findUnique({
        where: { id: revision.categoryId },
        select: { id: true },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Invalid category in revision" },
          { status: 400 }
        );
      }
    }

    // Process tags
    const validTags = revision.tags
      ? (Array.isArray(revision.tags) ? revision.tags : [])
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag.length > 0)
          .slice(0, 10)
      : [];

    // Sanitize metadata
    let sanitizedMetadata = null;
    if (revision.metadata && typeof revision.metadata === "object" && !Array.isArray(revision.metadata)) {
      sanitizedMetadata = Object.keys(revision.metadata).length > 0 
        ? JSON.parse(JSON.stringify(revision.metadata)) 
        : null;
    }

    // Generate new slug if title changed
    const { generateUniqueForumPostSlug } = await import("@/lib/forum-slug");
    const slug = await generateUniqueForumPostSlug(sanitizedTitle, post.id);

    // Update the post with revision data
    await db.forumPost.update({
      where: { id: post.id },
      data: {
        title: sanitizedTitle,
        content: sanitizedContent,
        tags: validTags,
        categoryId: revision.categoryId,
        metadata: sanitizedMetadata,
        slug,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true,
      message: "Post reverted successfully"
    });
  } catch (error) {
    console.error("Error reverting post:", error);
    return NextResponse.json(
      { error: "Failed to revert post" },
      { status: 500 }
    );
  }
}

