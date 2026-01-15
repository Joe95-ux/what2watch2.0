import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

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
    const type = searchParams.get("type"); // "all" | "posts" | "replies" | "drafts" | "upvotes" | "downvotes" | "saved_posts" | "saved_comments"
    const categoryId = searchParams.get("categoryId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const activities: Array<{
      id: string;
      type: string;
      title: string;
      createdAt: Date;
      metadata?: Record<string, any>;
    }> = [];

    // Helper to add date filter
    const getDateFilter = () => {
      const filter: { gte?: Date; lte?: Date } = {};
      if (startDate) filter.gte = new Date(startDate);
      if (endDate) filter.lte = new Date(endDate);
      return Object.keys(filter).length > 0 ? filter : undefined;
    };

    const dateFilter = getDateFilter();

    // Helper to build category filter
    const getCategoryFilter = (categoryField: string) => {
      if (!categoryId || categoryId === "all") return {};
      return { [categoryField]: categoryId };
    };

    // Helper to build search filter
    const getSearchFilter = () => {
      if (!search || !search.trim()) return {};
      return {
        OR: [
          { title: { contains: search.trim(), mode: "insensitive" } },
          { content: { contains: search.trim(), mode: "insensitive" } },
        ],
      };
    };

    // 1. Posts (CREATED_FORUM_POST)
    if (!type || type === "all" || type === "posts") {
      const where: any = {
        userId: user.id,
        ...getCategoryFilter("categoryId"),
        ...getSearchFilter(),
      };
      if (dateFilter) where.createdAt = dateFilter;

      const posts = await db.forumPost.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          createdAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: sortOrder === "asc" ? "asc" : "desc" },
        take: limit,
      });

      posts.forEach((post) => {
        activities.push({
          id: `post-${post.id}`,
          type: "CREATED_FORUM_POST",
          title: post.title,
          createdAt: post.createdAt,
          metadata: {
            postId: post.id,
            postSlug: post.slug,
            categoryId: post.category?.id,
            categoryName: post.category?.name,
            categorySlug: post.category?.slug,
            status: post.status,
          },
        });
      });
    }

    // 2. Replies (CREATED_FORUM_REPLY)
    if (!type || type === "all" || type === "replies") {
      const where: any = {
        userId: user.id,
        ...getSearchFilter(),
      };
      if (dateFilter) where.createdAt = dateFilter;

      const replies = await db.forumReply.findMany({
        where,
        select: {
          id: true,
          content: true,
          createdAt: true,
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: sortOrder === "asc" ? "asc" : "desc" },
        take: limit,
      });

      replies.forEach((reply) => {
        // Apply category filter if needed
        if (categoryId && categoryId !== "all" && reply.post.category?.id !== categoryId) {
          return;
        }

        activities.push({
          id: `reply-${reply.id}`,
          type: "CREATED_FORUM_REPLY",
          title: reply.post.title,
          createdAt: reply.createdAt,
          metadata: {
            replyId: reply.id,
            postId: reply.post.id,
            postSlug: reply.post.slug,
            categoryId: reply.post.category?.id,
            categoryName: reply.post.category?.name,
            categorySlug: reply.post.category?.slug,
          },
        });
      });
    }

    // 3. Drafts (PRIVATE or ARCHIVED posts)
    if (!type || type === "all" || type === "drafts") {
      const where: any = {
        userId: user.id,
        status: { in: ["PRIVATE", "ARCHIVED"] },
        ...getCategoryFilter("categoryId"),
        ...getSearchFilter(),
      };
      if (dateFilter) where.createdAt = dateFilter;

      const drafts = await db.forumPost.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          createdAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: sortOrder === "asc" ? "asc" : "desc" },
        take: limit,
      });

      drafts.forEach((post) => {
        activities.push({
          id: `draft-${post.id}`,
          type: "DRAFT_POST",
          title: post.title,
          createdAt: post.createdAt,
          metadata: {
            postId: post.id,
            postSlug: post.slug,
            categoryId: post.category?.id,
            categoryName: post.category?.name,
            categorySlug: post.category?.slug,
            status: post.status,
          },
        });
      });
    }

    // 4. Upvotes
    if (!type || type === "all" || type === "upvotes") {
      const where: any = {
        userId: user.id,
        reactionType: "upvote",
      };
      if (dateFilter) where.createdAt = dateFilter;

      const upvotes = await db.forumPostReaction.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: sortOrder === "asc" ? "asc" : "desc" },
        take: limit,
      });

      upvotes.forEach((reaction) => {
        // Apply category filter if needed
        if (categoryId && categoryId !== "all" && reaction.post.category?.id !== categoryId) {
          return;
        }

        // Apply search filter if needed
        if (search && search.trim() && !reaction.post.title.toLowerCase().includes(search.toLowerCase())) {
          return;
        }

        activities.push({
          id: `upvote-${reaction.id}`,
          type: "UPVOTED_POST",
          title: reaction.post.title,
          createdAt: reaction.createdAt,
          metadata: {
            postId: reaction.post.id,
            postSlug: reaction.post.slug,
            categoryId: reaction.post.category?.id,
            categoryName: reaction.post.category?.name,
            categorySlug: reaction.post.category?.slug,
          },
        });
      });
    }

    // 5. Downvotes
    if (!type || type === "all" || type === "downvotes") {
      const where: any = {
        userId: user.id,
        reactionType: "downvote",
      };
      if (dateFilter) where.createdAt = dateFilter;

      const downvotes = await db.forumPostReaction.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: sortOrder === "asc" ? "asc" : "desc" },
        take: limit,
      });

      downvotes.forEach((reaction) => {
        // Apply category filter if needed
        if (categoryId && categoryId !== "all" && reaction.post.category?.id !== categoryId) {
          return;
        }

        // Apply search filter if needed
        if (search && search.trim() && !reaction.post.title.toLowerCase().includes(search.toLowerCase())) {
          return;
        }

        activities.push({
          id: `downvote-${reaction.id}`,
          type: "DOWNVOTED_POST",
          title: reaction.post.title,
          createdAt: reaction.createdAt,
          metadata: {
            postId: reaction.post.id,
            postSlug: reaction.post.slug,
            categoryId: reaction.post.category?.id,
            categoryName: reaction.post.category?.name,
            categorySlug: reaction.post.category?.slug,
          },
        });
      });
    }

    // 6. Saved Posts
    if (!type || type === "all" || type === "saved_posts") {
      const where: any = {
        userId: user.id,
      };
      if (dateFilter) where.createdAt = dateFilter;

      const bookmarks = await db.forumBookmark.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: sortOrder === "asc" ? "asc" : "desc" },
        take: limit,
      });

      bookmarks.forEach((bookmark) => {
        // Apply category filter if needed
        if (categoryId && categoryId !== "all" && bookmark.post.category?.id !== categoryId) {
          return;
        }

        // Apply search filter if needed
        if (search && search.trim() && !bookmark.post.title.toLowerCase().includes(search.toLowerCase())) {
          return;
        }

        activities.push({
          id: `saved-post-${bookmark.id}`,
          type: "SAVED_POST",
          title: bookmark.post.title,
          createdAt: bookmark.createdAt,
          metadata: {
            postId: bookmark.post.id,
            postSlug: bookmark.post.slug,
            categoryId: bookmark.post.category?.id,
            categoryName: bookmark.post.category?.name,
            categorySlug: bookmark.post.category?.slug,
          },
        });
      });
    }

    // 7. Saved Comments
    if (!type || type === "all" || type === "saved_comments") {
      const where: any = {
        userId: user.id,
      };
      if (dateFilter) where.createdAt = dateFilter;

      const replyBookmarks = await db.forumReplyBookmark.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          reply: {
            select: {
              id: true,
              content: true,
              post: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  category: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: sortOrder === "asc" ? "asc" : "desc" },
        take: limit,
      });

      replyBookmarks.forEach((bookmark) => {
        // Apply category filter if needed
        if (categoryId && categoryId !== "all" && bookmark.reply.post.category?.id !== categoryId) {
          return;
        }

        // Apply search filter if needed
        if (search && search.trim() && !bookmark.reply.post.title.toLowerCase().includes(search.toLowerCase())) {
          return;
        }

        activities.push({
          id: `saved-comment-${bookmark.id}`,
          type: "SAVED_COMMENT",
          title: bookmark.reply.post.title,
          createdAt: bookmark.createdAt,
          metadata: {
            replyId: bookmark.reply.id,
            postId: bookmark.reply.post.id,
            postSlug: bookmark.reply.post.slug,
            categoryId: bookmark.reply.post.category?.id,
            categoryName: bookmark.reply.post.category?.name,
            categorySlug: bookmark.reply.post.category?.slug,
          },
        });
      });
    }

    // Sort all activities by date
    activities.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    // Format activities to match Activity interface
    const formattedActivities = activities.map((activity) => ({
      id: activity.id,
      type: activity.type as any,
      title: activity.title,
      createdAt: activity.createdAt.toISOString(),
      metadata: activity.metadata,
      user: {
        id: user.id,
        username: "",
        displayName: "",
        avatarUrl: null,
      },
    }));

    return NextResponse.json({
      activities: formattedActivities,
      total: formattedActivities.length,
    });
  } catch (error) {
    console.error("Error fetching forum activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch forum activity" },
      { status: 500 }
    );
  }
}

