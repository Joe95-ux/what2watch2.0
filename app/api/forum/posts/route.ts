import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch forum posts with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const tag = searchParams.get("tag");
    const categoryId = searchParams.get("categoryId");
    const categorySlug = searchParams.get("category");
    const tmdbId = searchParams.get("tmdbId");
    const mediaType = searchParams.get("mediaType");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt"; // createdAt, views, score, replies
    const order = searchParams.get("order") || "desc"; // asc, desc

    const skip = (page - 1) * limit;

    // Build where clause
    const whereConditions: any[] = [
      // Only show published posts (not scheduled for future)
      {
        OR: [
          { scheduledAt: null },
          { scheduledAt: { lte: new Date() } },
        ],
      },
      // Only show non-hidden posts
      { isHidden: false },
    ];

    if (search && search.trim()) {
      // Search in title and content
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

    if (tag) {
      where.tags = { has: tag };
    }
    if (categoryId) {
      where.categoryId = categoryId;
    } else if (categorySlug) {
      const category = await db.forumCategory.findUnique({
        where: { slug: categorySlug },
        select: { id: true },
      });
      if (category) {
        where.categoryId = category.id;
      }
    }
    if (tmdbId && mediaType) {
      where.tmdbId = parseInt(tmdbId, 10);
      where.mediaType = mediaType;
    }

    // Build orderBy
    let orderBy: any = {};
    if (sortBy === "replies") {
      // For replies count, we'll need to sort after fetching
      orderBy = { createdAt: order === "desc" ? "desc" : "asc" };
    } else {
      orderBy = { [sortBy]: order === "desc" ? "desc" : "asc" };
    }

    // Fetch posts
    const [posts, total] = await Promise.all([
      db.forumPost.findMany({
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
              userId: true,
              createdAt: true,
              updatedAt: true,
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
          reactions: {
            select: {
              id: true,
              reactionType: true,
              createdAt: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.forumPost.count({ where }),
    ]);

    // Sort by reply count if needed
    let sortedPosts = posts;
    if (sortBy === "replies") {
      sortedPosts = [...posts].sort((a, b) => {
        const aCount = a.replies.length;
        const bCount = b.replies.length;
        return order === "desc" ? bCount - aCount : aCount - bCount;
      });
    }

    // Calculate score from reactions (upvotes - downvotes)
    const calculateScore = (reactions: Array<{ reactionType: string }>) => {
      return reactions.reduce((score, reaction) => {
        if (reaction.reactionType === "upvote") return score + 1;
        if (reaction.reactionType === "downvote") return score - 1;
        return score;
      }, 0);
    };

    // Sort by score if needed
    if (sortBy === "score") {
      sortedPosts = [...posts].sort((a, b) => {
        const aScore = calculateScore(a.reactions as Array<{ reactionType: string }>);
        const bScore = calculateScore(b.reactions as Array<{ reactionType: string }>);
        return order === "desc" ? bScore - aScore : aScore - bScore;
      });
    }

    // Format response
    const formattedPosts = sortedPosts.map((post) => {
      const score = calculateScore(post.reactions as Array<{ reactionType: string }>);
      
      // Get unique contributors from replies (first 5)
      const contributorMap = new Map();
      (post.replies as Array<{ userId: string; user: any }>).forEach((reply) => {
        if (!contributorMap.has(reply.userId) && reply.user) {
          contributorMap.set(reply.userId, {
            id: reply.user.id,
            username: reply.user.username,
            displayName: reply.user.displayName || reply.user.username,
            avatarUrl: reply.user.avatarUrl,
          });
        }
      });
      const contributors = Array.from(contributorMap.values()).slice(0, 5);
      
      // Calculate last activity (most recent of: last reply, last reaction, or post update)
      const lastReplyDate = (post.replies as Array<{ createdAt: Date; updatedAt: Date }>).length > 0
        ? new Date(Math.max(
            ...(post.replies as Array<{ createdAt: Date; updatedAt: Date }>).map(r => 
              Math.max(new Date(r.createdAt).getTime(), new Date(r.updatedAt).getTime())
            )
          ))
        : null;
      const lastReactionDate = (post.reactions as Array<{ createdAt: Date }>).length > 0
        ? new Date(Math.max(
            ...(post.reactions as Array<{ createdAt: Date }>).map(r => new Date(r.createdAt).getTime())
          ))
        : null;
      const postUpdateDate = new Date(post.updatedAt);
      
      const activityDates = [
        lastReplyDate,
        lastReactionDate,
        postUpdateDate,
      ].filter(Boolean) as Date[];
      
      const lastActivity = activityDates.length > 0
        ? new Date(Math.max(...activityDates.map(d => d.getTime())))
        : postUpdateDate;
      
      return {
        id: post.id,
        slug: post.slug,
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
        views: post.views,
        score,
        replyCount: post.replies.length,
        contributors,
        lastActivity: lastActivity.toISOString(),
        author: {
          id: post.user.id,
          username: post.user.username,
          displayName: post.user.displayName || post.user.username,
          avatarUrl: post.user.avatarUrl,
        },
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
    console.error("Error fetching forum posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch forum posts" },
      { status: 500 }
    );
  }
}

// POST - Create a new forum post
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { title, content, tags, tmdbId, mediaType, categoryId, scheduledAt } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: "Title must be 200 characters or less" },
        { status: 400 }
      );
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { error: "Content must be 10,000 characters or less" },
        { status: 400 }
      );
    }

    // Validate tags
    const validTags = Array.isArray(tags)
      ? tags.filter((tag: any) => typeof tag === "string" && tag.length > 0 && tag.length <= 30).slice(0, 5)
      : [];

    // Validate category if provided
    if (categoryId) {
      const category = await db.forumCategory.findUnique({
        where: { id: categoryId },
      });
      if (!category || !category.isActive) {
        return NextResponse.json(
          { error: "Invalid or inactive category" },
          { status: 400 }
        );
      }
    }

    // Generate slug from title
    const { generateUniqueForumPostSlug } = await import("@/lib/forum-slug");
    const slug = await generateUniqueForumPostSlug(title.trim());

    // Parse scheduledAt if provided
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    if (scheduledDate && scheduledDate < new Date()) {
      return NextResponse.json(
        { error: "Scheduled date must be in the future" },
        { status: 400 }
      );
    }

    const post = await db.forumPost.create({
      data: {
        userId: user.id,
        title: title.trim(),
        slug,
        content: content.trim(),
        tags: validTags,
        categoryId: categoryId || null,
        tmdbId: tmdbId ? parseInt(tmdbId, 10) : null,
        mediaType: mediaType || null,
        views: 0,
        score: 0,
        scheduledAt: scheduledDate,
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
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
        replies: {
          select: {
            id: true,
          },
        },
      },
    });

    // Update category post count
    if (post.categoryId) {
      await db.forumCategory.update({
        where: { id: post.categoryId },
        data: {
          postCount: {
            increment: 1,
          },
        },
      });
    }

    return NextResponse.json({
      post: {
        id: post.id,
        slug: post.slug,
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
        } : null,
        views: post.views,
        score: post.score,
        replyCount: post.replies.length,
        author: {
          id: post.user.id,
          username: post.user.username,
          displayName: post.user.displayName || post.user.username,
          avatarUrl: post.user.avatarUrl,
        },
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error creating forum post:", error);
    return NextResponse.json(
      { error: "Failed to create forum post" },
      { status: 500 }
    );
  }
}

