import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  clampChannelReviewRating as clampRating,
  sanitizeReviewTags as sanitizeTags,
} from "../utils";
import { moderateContent } from "@/lib/moderation";

async function resolveCurrentUserId() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;
    const currentUserId = await resolveCurrentUserId();

    const review = await db.channelReview.findUnique({
      where: { id: reviewId },
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
    });

    if (!review || review.status !== "published") {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Get channel info
    const channel = await db.youTubeChannel.findUnique({
      where: { channelId: review.channelId },
      select: {
        title: true,
        thumbnail: true,
        slug: true,
      },
    });

    // Check if user has voted
    let viewerHasVoted = false;
    if (currentUserId) {
      const vote = await db.channelReviewVote.findFirst({
        where: {
          userId: currentUserId,
          reviewId: review.id,
        },
      });
      viewerHasVoted = Boolean(vote);
    }

    return NextResponse.json({
      id: review.id,
      channelId: review.channelId,
      channelTitle: channel?.title || null,
      channelThumbnail: channel?.thumbnail || null,
      channelSlug: channel?.slug || null,
      rating: review.rating,
      title: review.title,
      content: review.content,
      tags: review.tags,
      helpfulCount: review.helpfulCount,
      isEdited: review.isEdited,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      userId: review.userId,
      user: review.user,
      viewerHasVoted,
      canEdit: currentUserId === review.userId,
    });
  } catch (error) {
    console.error("[ChannelReviewDetail] GET error", error);
    return NextResponse.json({ error: "Failed to fetch review" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;
    const currentUserId = await resolveCurrentUserId();

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const review = await db.channelReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.userId !== currentUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { rating, title, content, tags } = body ?? {};

    // Validate and sanitize rating
    const parsedRating = rating !== undefined ? clampRating(rating) : review.rating;
    if (parsedRating === null) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    // Validate and sanitize content with moderation
    let sanitizedContent = review.content;
    if (content !== undefined) {
      const rawContent = typeof content === "string" ? content : "";
      const contentModeration = moderateContent(rawContent, {
        minLength: 20,
        maxLength: 1500,
        allowProfanity: false,
        sanitizeHtml: true,
      });

      if (!contentModeration.allowed) {
        return NextResponse.json(
          { error: contentModeration.error || "Invalid content" },
          { status: 400 }
        );
      }

      sanitizedContent = contentModeration.sanitized || "";
    }

    // Sanitize title with HTML sanitization
    let sanitizedTitle = review.title;
    if (title !== undefined) {
      const rawTitle = typeof title === "string" ? title : "";
      const titleModeration = moderateContent(rawTitle, {
        minLength: 0,
        maxLength: 120,
        allowProfanity: false,
        sanitizeHtml: true,
      });
      sanitizedTitle = titleModeration.allowed && titleModeration.sanitized
        ? titleModeration.sanitized || null
        : null;
    }

    // Sanitize tags
    let sanitizedTags = review.tags;
    if (tags !== undefined) {
      const baseSanitized = sanitizeTags(tags);
      sanitizedTags = baseSanitized.map((tag) => {
        const tagModeration = moderateContent(tag, {
          minLength: 1,
          maxLength: 24,
          allowProfanity: false,
          sanitizeHtml: true,
        });
        return tagModeration.allowed && tagModeration.sanitized
          ? tagModeration.sanitized
          : tag;
      });
    }

    const updatedReview = await db.channelReview.update({
      where: { id: reviewId },
      data: {
        rating: parsedRating,
        title: sanitizedTitle,
        content: sanitizedContent,
        tags: sanitizedTags,
        isEdited: true,
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
      },
    });

    return NextResponse.json({
      review: {
        ...updatedReview,
        viewerHasVoted: false,
        canEdit: true,
      },
    });
  } catch (error) {
    console.error("[ChannelReviewUpdate] PUT error", error);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}
