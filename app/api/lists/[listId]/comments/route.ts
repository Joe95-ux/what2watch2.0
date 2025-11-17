import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { moderateContent } from "@/lib/moderation";
import { checkRateLimit, COMMENT_RATE_LIMIT } from "@/lib/rate-limit";

// GET - Fetch comments for a list
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
): Promise<NextResponse<{ comments: unknown[] } | { error: string }>> {
  try {
    const { listId } = await params;
    const { userId: clerkUserId } = await auth();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "newest"; // newest, oldest, most-liked

    // Check if list exists and is accessible
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { id: true, userId: true, visibility: true },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check visibility
    if (list.visibility === "PRIVATE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (list.visibility === "FOLLOWERS_ONLY") {
      if (!clerkUserId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });

      if (!user || (user.id !== list.userId)) {
        const isFollowing = user
          ? await db.follow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: user.id,
                  followingId: list.userId,
                },
              },
            })
          : null;

        if (!isFollowing) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
      }
    }

    const comments = await db.listComment.findMany({
      where: {
        listId: listId,
        parentCommentId: null, // Only top-level comments
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
        reactions: {
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
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy:
        filter === "oldest"
          ? { createdAt: "asc" }
          : filter === "most-liked"
          ? { likes: "desc" }
          : { createdAt: "desc" },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Get comments API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch comments";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
): Promise<NextResponse<{ comment: unknown } | { error: string }>> {
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

    const { listId } = await params;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { content, parentCommentId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }

    // Check if list exists and is accessible
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { id: true, userId: true, visibility: true, blockedUsers: true },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check visibility
    if (list.visibility === "PRIVATE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (list.visibility === "FOLLOWERS_ONLY") {
      if (user.id !== list.userId) {
        const isFollowing = await db.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: user.id,
              followingId: list.userId,
            },
          },
        });

        if (!isFollowing) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
      }
    }

    // Check if user is blocked from commenting
    if (list.blockedUsers && list.blockedUsers.includes(user.id)) {
      return NextResponse.json({ error: "You have been blocked from commenting on this list" }, { status: 403 });
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(
      user.id,
      COMMENT_RATE_LIMIT.maxRequests,
      COMMENT_RATE_LIMIT.windowMs
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.error || "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": COMMENT_RATE_LIMIT.maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    // Content moderation
    const moderationResult = moderateContent(content, {
      minLength: 1,
      maxLength: 5000,
      allowProfanity: false,
      sanitizeHtml: true,
    });

    if (!moderationResult.allowed) {
      return NextResponse.json(
        { error: moderationResult.error || "Comment does not meet our content guidelines." },
        { status: 400 }
      );
    }

    // If replying, verify parent comment exists and belongs to same list
    if (parentCommentId) {
      const parentComment = await db.listComment.findFirst({
        where: {
          id: parentCommentId,
          listId: listId,
        },
      });

      if (!parentComment) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
    }

    const comment = await db.listComment.create({
      data: {
        listId: listId,
        userId: user.id,
        content: moderationResult.sanitized || content.trim(),
        parentCommentId: parentCommentId || null,
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
          },
        },
      },
    });

    return NextResponse.json(
      { comment },
      {
        status: 201,
        headers: {
          "X-RateLimit-Limit": COMMENT_RATE_LIMIT.maxRequests.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": new Date(rateLimitResult.resetTime).toISOString(),
        },
      }
    );
  } catch (error) {
    console.error("Create comment API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create comment";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

