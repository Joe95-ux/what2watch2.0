"use server";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  clampChannelReviewRating as clampRating,
  sanitizeReviewTags as sanitizeTags,
} from "./utils";
import { evaluateReviewerBadges } from "@/lib/youtube-review-badges";

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 20;

const SORT_MAP: Record<string, Prisma.ChannelReviewOrderByWithRelationInput[]> = {
  helpful: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
  newest: [{ createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
  highest: [{ rating: "desc" }, { createdAt: "desc" }],
  lowest: [{ rating: "asc" }, { createdAt: "asc" }],
};

type ChannelReviewResponse = Awaited<ReturnType<typeof buildResponse>>;

async function resolveCurrentUserId() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });

  return user?.id ?? null;
}

async function buildResponse(params: {
  where: Prisma.ChannelReviewWhereInput;
  orderBy: Prisma.ChannelReviewOrderByWithRelationInput[];
  skip: number;
  take: number;
  channelId: string;
  currentUserId: string | null;
}) {
  const { where, orderBy, skip, take, channelId, currentUserId } = params;

  const [reviews, total, statsSource, viewerReviewRecord] = await Promise.all([
    db.channelReview.findMany({
      where,
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
      orderBy,
      skip,
      take,
    }),
    db.channelReview.count({ where }),
    db.channelReview.findMany({
      where,
      select: { rating: true, tags: true },
    }),
    currentUserId
      ? db.channelReview.findFirst({
          where: { channelId, userId: currentUserId },
          select: { id: true, rating: true, title: true, content: true, tags: true },
        })
      : Promise.resolve(null),
  ]);

  const reviewIds = reviews.map((review) => review.id);
  let viewerVotes = new Set<string>();

  if (currentUserId && reviewIds.length > 0) {
    const votes = await db.channelReviewVote.findMany({
      where: {
        userId: currentUserId,
        reviewId: { in: reviewIds },
      },
      select: { reviewId: true },
    });
    viewerVotes = new Set(votes.map((vote) => vote.reviewId));
  }

  const ratingDistribution = Array.from({ length: 5 }, (_, index) => {
    const ratingValue = 5 - index;
    const count = statsSource.filter((entry) => entry.rating === ratingValue).length;
    return { rating: ratingValue, count };
  });

  const totalReviews = statsSource.length;
  const averageRating =
    totalReviews > 0
      ? statsSource.reduce((sum, entry) => sum + entry.rating, 0) / totalReviews
      : 0;

  const tagCounts = statsSource
    .flatMap((entry) => entry.tags || [])
    .reduce<Record<string, number>>((acc, tag) => {
      const normalized = tag.trim();
      if (!normalized) return acc;
      acc[normalized] = (acc[normalized] || 0) + 1;
      return acc;
    }, {});

  const tagCloud = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const reviewsWithViewerState = reviews.map((review) => ({
    id: review.id,
    channelId: review.channelId,
    rating: review.rating,
    title: review.title,
    content: review.content,
    tags: review.tags,
    helpfulCount: review.helpfulCount,
    isEdited: review.isEdited,
    status: review.status,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    userId: review.userId,
    user: review.user,
    viewerHasVoted: viewerVotes.has(review.id),
    canEdit: currentUserId === review.userId,
  }));

  return {
    reviews: reviewsWithViewerState,
    stats: {
      totalReviews,
      averageRating,
      ratingDistribution: ratingDistribution.map((entry) => ({
        ...entry,
        percentage: totalReviews > 0 ? (entry.count / totalReviews) * 100 : 0,
      })),
      tags: tagCloud,
    },
    viewerState: {
      userId: currentUserId,
      hasReview: Boolean(viewerReviewRecord),
      reviewId: viewerReviewRecord?.id ?? null,
      reviewDraft: viewerReviewRecord,
      canReview: Boolean(currentUserId) && !viewerReviewRecord,
    },
    pagination: {
      page: Math.floor(skip / take) + 1,
      limit: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    const limitParam = Number(searchParams.get("limit") || DEFAULT_LIMIT);
    const pageParam = Number(searchParams.get("page") || 1);
    const ratingParam = clampRating(searchParams.get("rating"));
    const sortParam = searchParams.get("sort") || "helpful";
    const tagParam = searchParams.get("tag");

    const limit = Math.max(1, Math.min(MAX_LIMIT, limitParam));
    const page = Math.max(1, pageParam);
    const skip = (page - 1) * limit;

    const where: Prisma.ChannelReviewWhereInput = {
      channelId,
      status: "published",
    };

    if (ratingParam) {
      where.rating = ratingParam;
    }

    if (tagParam) {
      where.tags = { has: tagParam };
    }

    const currentUserId = await resolveCurrentUserId();
    const orderBy = SORT_MAP[sortParam] || SORT_MAP.helpful;

    const response = await buildResponse({
      where,
      orderBy,
      skip,
      take: limit,
      channelId,
      currentUserId,
    });

    return NextResponse.json(response satisfies ChannelReviewResponse);
  } catch (error) {
    console.error("[ChannelReviews] GET error", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { channelId, rating, title, content, tags } = body ?? {};

    if (!channelId || !content || typeof rating === "undefined") {
      return NextResponse.json(
        { error: "channelId, rating, and content are required" },
        { status: 400 }
      );
    }

    const parsedRating = clampRating(rating);
    if (!parsedRating) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const sanitizedContent = typeof content === "string" ? content.trim() : "";
    if (!sanitizedContent) {
      return NextResponse.json({ error: "Review content is required" }, { status: 400 });
    }

    const existingReview = await db.channelReview.findUnique({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this channel" },
        { status: 409 }
      );
    }

    const channel = await db.youTubeChannel.findUnique({
      where: { channelId },
      select: { channelId: true },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const sanitizedTags = sanitizeTags(tags);
    const sanitizedTitle = typeof title === "string" ? title.trim() : "";

    const review = await db.channelReview.create({
      data: {
        channelId,
        userId: user.id,
        rating: parsedRating,
        title: sanitizedTitle || null,
        content: sanitizedContent,
        tags: sanitizedTags,
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

    await evaluateReviewerBadges(user.id);

    return NextResponse.json({
      review: {
        ...review,
        viewerHasVoted: false,
        canEdit: true,
      },
    });
  } catch (error) {
    console.error("[ChannelReviews] POST error", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}


