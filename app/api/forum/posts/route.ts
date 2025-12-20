import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { moderateContent } from "@/lib/moderation";
import { sanitizeTitle, sanitizeContent } from "@/lib/server-html-sanitizer";
import { checkDuplicateContent, checkRapidPosting } from "@/lib/spam-detection";
import { validateLinksInContent } from "@/lib/link-validation";
import { extractMentions } from "@/lib/forum-mentions";
import { sendEmail } from "@/lib/email";
import { getForumMentionEmail } from "@/lib/email-templates";

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

    if (tag) {
      whereConditions.push({ tags: { has: tag } });
    }
    
    if (categoryId) {
      whereConditions.push({ categoryId });
    } else if (categorySlug) {
      const category = await db.forumCategory.findUnique({
        where: { slug: categorySlug },
        select: { id: true },
      });
      if (category) {
        whereConditions.push({ categoryId: category.id });
      }
    }
    
    if (tmdbId && mediaType) {
      whereConditions.push({
        tmdbId: parseInt(tmdbId, 10),
        mediaType,
      });
    }

    const where: any = {
      AND: whereConditions,
    };

    // Build orderBy
    let orderBy: any = {};
    if (sortBy === "replies" || sortBy === "score") {
      // For replies count and score, we'll need to sort after fetching (client-side)
      // Use createdAt as initial sort to ensure consistent ordering
      orderBy = { createdAt: order === "desc" ? "desc" : "asc" };
    } else if (sortBy === "createdAt" || sortBy === "updatedAt" || sortBy === "views") {
      // For these fields, use the field directly with createdAt as secondary sort
      orderBy = [
        { [sortBy]: order === "desc" ? "desc" : "asc" },
        { createdAt: "desc" }, // Secondary sort for consistency
      ];
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


    // Calculate score from reactions (upvotes - downvotes)
    const calculateScore = (reactions: Array<{ reactionType: string }>) => {
      return reactions.reduce((score, reaction) => {
        if (reaction.reactionType === "upvote") return score + 1;
        if (reaction.reactionType === "downvote") return score - 1;
        return score;
      }, 0);
    };

    // Sort by reply count or score if needed (client-side sorting after fetching)
    let sortedPosts = posts;
    if (sortBy === "replies") {
      sortedPosts = [...posts].sort((a, b) => {
        const aCount = a.replies.length;
        const bCount = b.replies.length;
        if (aCount !== bCount) {
          return order === "desc" ? bCount - aCount : aCount - bCount;
        }
        // If reply counts are equal, sort by createdAt as tiebreaker
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else if (sortBy === "score") {
      sortedPosts = [...posts].sort((a, b) => {
        const aScore = calculateScore(a.reactions as Array<{ reactionType: string }>);
        const bScore = calculateScore(b.reactions as Array<{ reactionType: string }>);
        if (aScore !== bScore) {
          return order === "desc" ? bScore - aScore : aScore - bScore;
        }
        // If scores are equal, sort by createdAt as tiebreaker
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
            displayName: reply.user.username || reply.user.displayName,
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
        contributors,
        lastActivity: lastActivity.toISOString(),
        author: {
          id: post.user.id,
          username: post.user.username,
          displayName: post.user.username || post.user.displayName,
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

    // Rate limiting - 5 posts per hour
    const rateLimitResult = checkRateLimit(
      user.id,
      5,
      60 * 60 * 1000 // 1 hour
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.error || "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    const body = await request.json();
    const { title, content, tags, tmdbId, mediaType, categoryId, metadata, scheduledAt } = body;

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

    // Server-side content moderation and sanitization
    const titleModeration = moderateContent(title.trim(), {
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

    const contentModeration = moderateContent(content.trim(), {
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

    // Sanitize HTML on server-side (additional layer of protection)
    const sanitizedTitle = sanitizeTitle(titleModeration.sanitized || title.trim());
    const sanitizedContent = sanitizeContent(contentModeration.sanitized || content.trim());

    // Spam detection - Check for duplicate content
    const duplicateCheck = await checkDuplicateContent(sanitizedTitle, sanitizedContent, user.id);
    if (duplicateCheck.isDuplicate) {
      return NextResponse.json(
        { error: duplicateCheck.reason || "This content appears to be a duplicate." },
        { status: 400 }
      );
    }

    // Spam detection - Check for rapid posting
    const rapidPostingCheck = await checkRapidPosting(user.id, 5, 60 * 60 * 1000);
    if (rapidPostingCheck.isRapid) {
      return NextResponse.json(
        { error: rapidPostingCheck.reason || "You are posting too frequently. Please slow down." },
        { status: 429 }
      );
    }

    // Link validation - Check all links in content
    const linkValidation = await validateLinksInContent(sanitizedContent);
    if (!linkValidation.allSafe && linkValidation.unsafeLinks.length > 0) {
      const firstUnsafe = linkValidation.unsafeLinks[0];
      return NextResponse.json(
        { error: firstUnsafe.reason || "One or more links in your content are not safe." },
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

    // Validate and sanitize metadata if provided
    let sanitizedMetadata = null;
    if (metadata && typeof metadata === "object" && Object.keys(metadata).length > 0) {
      // Only allow metadata if category is selected
      if (!categoryId) {
        return NextResponse.json(
          { error: "Metadata can only be provided when a category is selected" },
          { status: 400 }
        );
      }
      // Sanitize metadata - ensure it's a plain object
      sanitizedMetadata = JSON.parse(JSON.stringify(metadata));
    }

    const post = await db.forumPost.create({
      data: {
        userId: user.id,
        title: sanitizedTitle,
        slug,
        content: sanitizedContent,
        tags: validTags,
        categoryId: categoryId || null,
        metadata: sanitizedMetadata,
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

    // Create activity for forum post creation
    try {
      await db.activity.create({
        data: {
          userId: user.id,
          type: "CREATED_FORUM_POST",
          title: post.title,
          metadata: {
            postId: post.id,
            postSlug: post.slug,
            categoryId: post.categoryId,
            categoryName: post.category?.name,
            tmdbId: post.tmdbId,
            mediaType: post.mediaType,
          },
        },
      });
    } catch (error) {
      // Silently fail - activity creation is not critical
      console.error("Failed to create activity for forum post:", error);
    }

    // Create notifications for mentioned users
    try {
      const mentionedUsernames = extractMentions(sanitizedContent);
      if (mentionedUsernames.length > 0) {
        const mentionedUsers = await db.user.findMany({
          where: {
            username: { in: mentionedUsernames },
          },
          select: { id: true, username: true },
        });

        const actorDisplayName = post.user.username || post.user.displayName || "Someone";
        const notificationsToCreate = [];

        for (const mentionedUser of mentionedUsers) {
          if (mentionedUser.id !== user.id) {
            notificationsToCreate.push({
              userId: mentionedUser.id,
              type: "POST_MENTION",
              postId: post.id,
              actorId: user.id,
              title: "You were mentioned in a post",
              message: `${actorDisplayName} mentioned you in "${post.title}"`,
            });
          }
        }

        if (notificationsToCreate.length > 0) {
          await db.forumNotification.createMany({
            data: notificationsToCreate,
          });

          // Send email notifications (async, don't block response)
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const postUrl = `${baseUrl}/forum/${post.slug}`;
          const notificationSettingsUrl = `${baseUrl}/dashboard/settings`;
          const postPreview = sanitizedContent.replace(/<[^>]*>/g, "").substring(0, 200);
          const fullPostPreview = postPreview.length < sanitizedContent.replace(/<[^>]*>/g, "").length 
            ? postPreview + "..." 
            : postPreview;

          // Fetch user details for email notifications
          const notificationUsers = await db.user.findMany({
            where: {
              id: { in: notificationsToCreate.map(n => n.userId) },
            },
            select: {
              id: true,
              email: true,
              emailNotifications: true,
              displayName: true,
              username: true,
            },
          });

          const userMap = new Map(notificationUsers.map(u => [u.id, u]));
          const actorDisplayName = post.user.username || post.user.displayName || "Someone";

          // Send emails for each notification
          for (const notification of notificationsToCreate) {
            const recipient = userMap.get(notification.userId);
            if (!recipient || !recipient.email || !recipient.emailNotifications) {
              continue;
            }

            try {
              const emailHtml = getForumMentionEmail({
                recipientName: recipient.username || recipient.displayName || "User",
                actorName: actorDisplayName,
                contentType: "post",
                contentTitle: post.title,
                contentPreview: fullPostPreview,
                viewContentUrl: postUrl,
                notificationSettingsUrl,
              });

              await sendEmail({
                to: recipient.email,
                subject: `${actorDisplayName} mentioned you in a post: ${post.title}`,
                html: emailHtml,
              });
            } catch (emailError) {
              // Silently fail - email sending is not critical
              console.error(`Failed to send email notification to ${recipient.email}:`, emailError);
            }
          }
        }
      }
    } catch (error) {
      // Silently fail - notification creation is not critical
      console.error("Failed to create mention notifications for forum post:", error);
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
          displayName: post.user.username || post.user.displayName,
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

