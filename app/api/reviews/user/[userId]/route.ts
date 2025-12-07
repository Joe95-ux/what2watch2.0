import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "24", 10);
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      userId,
    };

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
        orderBy: {
          createdAt: "desc",
        },
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
    console.error("Error fetching user reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

