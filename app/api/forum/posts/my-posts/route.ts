import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch current user's forum posts with pagination and filters
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status"); // all, published, scheduled, archived, private
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt"; // createdAt, views, score, replies
    const order = searchParams.get("order") || "desc"; // asc, desc

    const skip = (page - 1) * limit;

    // Build where clause - only user's posts
    const whereConditions: any[] = [
      { userId: user.id },
    ];

    // Status filter
    if (status && status !== "all") {
      if (status === "published") {
        whereConditions.push({
          status: "PUBLIC",
        });
        whereConditions.push({
          OR: [
            { scheduledAt: null },
            { scheduledAt: { lte: new Date() } },
          ],
        });
      } else if (status === "scheduled") {
        whereConditions.push({
          scheduledAt: { gt: new Date() },
        });
      } else if (status === "archived") {
        whereConditions.push({ status: "ARCHIVED" });
      } else if (status === "private") {
        whereConditions.push({ status: "PRIVATE" });
      }
    }

    // Category filter
    if (categoryId) {
      whereConditions.push({ categoryId });
    }

    // Search filter
    if (search && search.trim()) {
      whereConditions.push({
        OR: [
          { title: { contains: search.trim(), mode: "insensitive" } },
          { content: { contains: search.trim(), mode: "insensitive" } },
        ],
      });
    }

    const where: any = {
      AND: whereConditions,
    };

    // Build orderBy
    let orderBy: any = {};
    if (sortBy === "replies" || sortBy === "score") {
      orderBy = { createdAt: order === "desc" ? "desc" : "asc" };
    } else if (sortBy === "createdAt" || sortBy === "updatedAt" || sortBy === "views") {
      orderBy = [
        { [sortBy]: order === "desc" ? "desc" : "asc" },
        { createdAt: "desc" },
      ];
    } else {
      orderBy = { [sortBy]: order === "desc" ? "desc" : "asc" };
    }

    // Fetch posts
    const [posts, total] = await Promise.all([
      db.forumPost.findMany({
        where,
        include: {
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
            select: {
              id: true,
            },
          },
          reactions: {
            select: {
              id: true,
              reactionType: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.forumPost.count({ where }),
    ]);

    // Calculate score from reactions
    const calculateScore = (reactions: Array<{ reactionType: string }>) => {
      return reactions.reduce((score, reaction) => {
        if (reaction.reactionType === "upvote") return score + 1;
        if (reaction.reactionType === "downvote") return score - 1;
        return score;
      }, 0);
    };

    // Sort by reply count or score if needed
    let sortedPosts = posts;
    if (sortBy === "replies") {
      sortedPosts = [...posts].sort((a, b) => {
        const aCount = a.replies.length;
        const bCount = b.replies.length;
        if (aCount !== bCount) {
          return order === "desc" ? bCount - aCount : aCount - bCount;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else if (sortBy === "score") {
      sortedPosts = [...posts].sort((a, b) => {
        const aScore = calculateScore(a.reactions as Array<{ reactionType: string }>);
        const bScore = calculateScore(b.reactions as Array<{ reactionType: string }>);
        if (aScore !== bScore) {
          return order === "desc" ? bScore - aScore : aScore - bScore;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    // Format response
    const formattedPosts = sortedPosts.map((post) => {
      const score = calculateScore(post.reactions as Array<{ reactionType: string }>);
      
      // Determine status
      let postStatus = post.status;
      if (post.scheduledAt && new Date(post.scheduledAt) > new Date()) {
        postStatus = "SCHEDULED";
      }

      return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        content: post.content,
        tags: post.tags,
        metadata: post.metadata,
        tmdbId: post.tmdbId,
        mediaType: post.mediaType,
        category: post.category ? {
          id: post.category.id,
          name: post.category.name,
          slug: post.category.slug,
          color: post.category.color,
          icon: post.category.icon,
        } : null,
        views: post.views,
        score,
        replyCount: post.replies.length,
        status: postStatus,
        scheduledAt: post.scheduledAt,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      };
    });

    return NextResponse.json({
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

