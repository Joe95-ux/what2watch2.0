import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET - Fetch all reports (posts and replies) for admin review
export async function GET(request: NextRequest) {
  try {
    await requireModerator();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const statusParam = searchParams.get("status");
    const status = statusParam === "all" ? undefined : statusParam; // undefined = all statuses
    const type = searchParams.get("type") || "all"; // all, post, reply

    const skip = (page - 1) * limit;

    console.log("[Reports API] Query params:", { page, limit, status, type });

    // Build where clauses - simple and straightforward
    const postReportsWhere: any = {};
    const replyReportsWhere: any = {};
    
    // Apply status filter if specified
    if (status) {
      postReportsWhere.status = status;
      replyReportsWhere.status = status;
    }
    
    console.log("[Reports API] Where clauses:", { postReportsWhere, replyReportsWhere });
    
    // Determine which tables to query
    const shouldFetchPosts = type === "all" || type === "post";
    const shouldFetchReplies = type === "all" || type === "reply";

    console.log("[Reports API] Fetching:", { shouldFetchPosts, shouldFetchReplies });

    // Fetch reports from both tables
  
    console.log("[Reports API] Starting database queries...");
    const [allPostReports, allReplyReports] = await Promise.all([
      shouldFetchPosts
        ? db.forumPostReport.findMany({
            where: postReportsWhere,
            select: {
              id: true,
              postId: true,
              userId: true,
              reason: true,
              description: true,
              status: true,
              appealReason: true,
              appealAt: true,
              reviewedAt: true,
              reviewedById: true,
              reviewNotes: true,
              createdAt: true,
              // Exclude updatedAt - some records have null values causing Prisma errors
              // We'll compute it as reviewedAt || createdAt in the mapping
              post: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  content: true,
                  userId: true,
                  user: {
                    select: {
                      id: true,
                      username: true,
                      displayName: true,
                    },
                  },
                },
              },
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
              reviewedBy: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      shouldFetchReplies
        ? db.forumReplyReport.findMany({
            where: replyReportsWhere,
            select: {
              id: true,
              replyId: true,
              userId: true,
              reason: true,
              description: true,
              status: true,
              appealReason: true,
              appealAt: true,
              reviewedAt: true,
              reviewedById: true,
              reviewNotes: true,
              createdAt: true,
              // Exclude updatedAt - some records have null values causing Prisma errors
              // We'll compute it as reviewedAt || createdAt in the mapping
              reply: {
                select: {
                  id: true,
                  content: true,
                  userId: true,
                  postId: true,
                  post: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                    },
                  },
                  user: {
                    select: {
                      id: true,
                      username: true,
                      displayName: true,
                    },
                  },
                },
              },
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
              reviewedBy: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

    console.log("[Reports API] Fetched:", { 
      postReportsCount: allPostReports.length, 
      replyReportsCount: allReplyReports.length 
    });

    // Combine and format reports with null safety
    console.log("[Reports API] Combining and formatting reports...");
    let allReports = [
      ...allPostReports
        .filter((report) => report.post) // Filter out reports with deleted posts
        .map((report) => ({
          id: report.id,
          type: "post" as const,
          targetId: report.postId,
          target: {
            id: report.post.id,
            title: report.post.title,
            slug: report.post.slug,
            content: report.post.content,
            author: report.post.user || {
              id: "",
              username: "Unknown",
              displayName: "Unknown",
            },
          },
          reporter: report.user || {
            id: "",
            username: "Unknown",
            displayName: "Unknown",
          },
          reason: report.reason,
          description: report.description,
          status: report.status,
          appealReason: report.appealReason,
          appealAt: report.appealAt,
          reviewedBy: report.reviewedBy || null,
          reviewedAt: report.reviewedAt,
          reviewNotes: report.reviewNotes,
          createdAt: report.createdAt,
          updatedAt: report.reviewedAt || report.createdAt, // Use reviewedAt if available, otherwise createdAt
        })),
      ...allReplyReports
        .filter((report) => report.reply && report.reply.post) // Filter out reports with deleted replies/posts
        .map((report) => ({
          id: report.id,
          type: "reply" as const,
          targetId: report.replyId,
          target: {
            id: report.reply.id,
            content: report.reply.content,
            author: report.reply.user || {
              id: "",
              username: "Unknown",
              displayName: "Unknown",
            },
            post: {
              id: report.reply.post.id,
              title: report.reply.post.title,
              slug: report.reply.post.slug,
            },
          },
          reporter: report.user || {
            id: "",
            username: "Unknown",
            displayName: "Unknown",
          },
          reason: report.reason,
          description: report.description,
          status: report.status,
          appealReason: report.appealReason,
          appealAt: report.appealAt,
          reviewedBy: report.reviewedBy || null,
          reviewedAt: report.reviewedAt,
          reviewNotes: report.reviewNotes,
          createdAt: report.createdAt,
          updatedAt: report.reviewedAt || report.createdAt, // Use reviewedAt if available, otherwise createdAt
        })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log("[Reports API] Combined reports:", { totalCount: allReports.length });

    // Calculate total before pagination
    const total = allReports.length;

    // Apply pagination
    const paginatedReports = allReports.slice(skip, skip + limit);

    console.log("[Reports API] Paginated:", { 
      skip, 
      limit, 
      total, 
      returnedCount: paginatedReports.length 
    });

    return NextResponse.json({
      reports: paginatedReports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    // Handle auth errors
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      console.error("[Reports API] Auth error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    // Log full error for debugging
    console.error("[Reports API] Error fetching reports:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
    });
    return NextResponse.json(
      { 
        error: "Failed to fetch reports",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

