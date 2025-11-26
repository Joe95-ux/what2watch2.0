import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

async function resolveCurrentUserId() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageParam = Number(searchParams.get("page") || 1);
    const limitParam = Number(searchParams.get("limit") || DEFAULT_LIMIT);

    const limit = Math.max(1, Math.min(MAX_LIMIT, limitParam));
    const page = Math.max(1, pageParam);
    const skip = (page - 1) * limit;

    const currentUserId = await resolveCurrentUserId();

    const where: Prisma.ChannelReviewWhereInput = {
      status: "published",
    };

    const [reviews, total] = await Promise.all([
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
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
      db.channelReview.count({ where }),
    ]);

    // Get review IDs and check if current user has voted
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

    // Get channel info for reviews
    const channelIds = Array.from(new Set(reviews.map((r) => r.channelId)));
    const channels = await db.youTubeChannel.findMany({
      where: { channelId: { in: channelIds } },
      select: {
        channelId: true,
        title: true,
        thumbnail: true,
        slug: true,
      },
    });

    const channelMap = new Map(channels.map((c) => [c.channelId, c]));

    const response = reviews.map((review) => {
      const channel = channelMap.get(review.channelId);
      return {
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
        status: review.status,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        userId: review.userId,
        user: review.user,
        viewerHasVoted: viewerVotes.has(review.id),
        canEdit: currentUserId === review.userId,
      };
    });

    return NextResponse.json({
      reviews: response,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("[ChannelReviewsRecent] GET error", error);
    return NextResponse.json({ error: "Failed to fetch recent reviews" }, { status: 500 });
  }
}

