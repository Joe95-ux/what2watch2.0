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

    // Build where clauses
    const postReportsWhere: any = {};
    const replyReportsWhere: any = {};
    
    // Apply status filter if specified
    if (status) {
      postReportsWhere.status = status;
      replyReportsWhere.status = status;
    }
    
    // Apply type filter - fetch only the needed type
    const shouldFetchPosts = type === "all" || type === "post";
    const shouldFetchReplies = type === "all" || type === "reply";

    // Fetch all post reports (no pagination yet - we'll paginate after combining)
    const [allPostReports, allReplyReports] = await Promise.all([
      shouldFetchPosts
        ? db.forumPostReport.findMany({
            where: postReportsWhere,
            include: {
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
            include: {
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

    // Combine and format reports
    let allReports = [
      ...allPostReports.map((report) => ({
        id: report.id,
        type: "post" as const,
        targetId: report.postId,
        target: {
          id: report.post.id,
          title: report.post.title,
          slug: report.post.slug,
          content: report.post.content,
          author: report.post.user,
        },
        reporter: report.user,
        reason: report.reason,
        description: report.description,
        status: report.status,
        appealReason: report.appealReason,
        appealAt: report.appealAt,
        reviewedBy: report.reviewedBy,
        reviewedAt: report.reviewedAt,
        reviewNotes: report.reviewNotes,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      })),
      ...allReplyReports.map((report) => ({
        id: report.id,
        type: "reply" as const,
        targetId: report.replyId,
        target: {
          id: report.reply.id,
          content: report.reply.content,
          author: report.reply.user,
          post: {
            id: report.reply.post.id,
            title: report.reply.post.title,
            slug: report.reply.post.slug,
          },
        },
        reporter: report.user,
        reason: report.reason,
        description: report.description,
        status: report.status,
        appealReason: report.appealReason,
        appealAt: report.appealAt,
        reviewedBy: report.reviewedBy,
        reviewedAt: report.reviewedAt,
        reviewNotes: report.reviewNotes,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate total before pagination
    const total = allReports.length;

    // Apply pagination
    const paginatedReports = allReports.slice(skip, skip + limit);

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
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

