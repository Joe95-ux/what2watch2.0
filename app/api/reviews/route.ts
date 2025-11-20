import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET /api/reviews?tmdbId=123&mediaType=movie&rating=5&sortBy=featured&page=1
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tmdbId = searchParams.get("tmdbId");
    const mediaType = searchParams.get("mediaType") as "movie" | "tv" | null;
    const rating = searchParams.get("rating");
    const sortBy = searchParams.get("sortBy") || "featured";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    if (!tmdbId || !mediaType) {
      return NextResponse.json(
        { error: "tmdbId and mediaType are required" },
        { status: 400 }
      );
    }

    const where: Prisma.ReviewWhereInput = {
      tmdbId: parseInt(tmdbId, 10),
      mediaType,
    };

    if (rating) {
      where.rating = parseInt(rating, 10);
    }

    const orderBy: Prisma.ReviewOrderByWithRelationInput = {};
    switch (sortBy) {
      case "featured":
        orderBy.isFeatured = "desc";
        orderBy.createdAt = "desc";
        break;
      case "date":
        orderBy.createdAt = "desc";
        break;
      case "rating":
        orderBy.rating = "desc";
        orderBy.createdAt = "desc";
        break;
      case "helpful":
        orderBy.helpful = "desc";
        orderBy.createdAt = "desc";
        break;
      default:
        orderBy.createdAt = "desc";
    }

    // Get current user if authenticated
    const { userId: clerkUserId } = await auth();
    let currentUserId: string | null = null;
    if (clerkUserId) {
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
      currentUserId = user?.id || null;
    }

    const [reviews, total] = await Promise.all([
      db.review.findMany({
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
          reactions: {
            select: {
              id: true,
              userId: true,
              reactionType: true,
            },
          },
          _count: {
            select: {
              reactions: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.review.count({ where }),
    ]);

    // Calculate reaction counts and user reactions
    type ReviewWithRelations = Prisma.ReviewGetPayload<{
      include: {
        user: {
          select: {
            id: true;
            username: true;
            displayName: true;
            avatarUrl: true;
          };
        };
        reactions: {
          select: {
            id: true;
            userId: true;
            reactionType: true;
          };
        };
        _count: {
          select: {
            reactions: true;
          };
        };
      };
    }>;

    const reviewsWithReactions = reviews.map((review: ReviewWithRelations) => {
      const reactionCounts: Record<string, number> = {};
      const userReactions: string[] = [];
      
      review.reactions.forEach((reaction) => {
        reactionCounts[reaction.reactionType] =
          (reactionCounts[reaction.reactionType] || 0) + 1;
        
        if (currentUserId && reaction.userId === currentUserId) {
          userReactions.push(reaction.reactionType);
        }
      });

      return {
        ...review,
        reactionCounts,
        totalReactions: review._count.reactions,
        userReactions,
      };
    });

    return NextResponse.json({
      reviews: reviewsWithReactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Create a new review
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tmdbId, mediaType, rating, title, content } = body;

    if (!tmdbId || !mediaType || !rating || !content) {
      return NextResponse.json(
        { error: "tmdbId, mediaType, rating, and content are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 10) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 10" },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if review already exists
    const existingReview = await db.review.findUnique({
      where: {
        userId_tmdbId_mediaType: {
          userId: user.id,
          tmdbId: parseInt(tmdbId, 10),
          mediaType,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this title" },
        { status: 409 }
      );
    }

    const review = await db.review.create({
      data: {
        userId: user.id,
        tmdbId: parseInt(tmdbId, 10),
        mediaType,
        rating,
        title: title || null,
        content,
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
        reactions: true,
        _count: {
          select: {
            reactions: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...review,
      reactionCounts: {},
      totalReactions: 0,
      userReactions: [],
    });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}

