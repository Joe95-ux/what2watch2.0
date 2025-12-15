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
    const status = statusParam === "all" ? undefined : (statusParam || "pending"); // undefined = all, pending, reviewed, appealed, appeal_approved, appeal_rejected
    const type = searchParams.get("type") || "all"; // all, post, reply

    const skip = (page - 1) * limit;

    // Fetch post reports
    const postReportsWhere: any = status ? { status } : {};
    
    // If type is "all", we need to fetch all reports first, then paginate after combining
    // If type is "post" or "reply", we can paginate directly
    const shouldFetchAll = type === "all";
    const postSkip = shouldFetchAll ? 0 : (type === "reply" ? 0 : skip);
    const postTake = shouldFetchAll ? undefined : (type === "reply" ? 0 : limit);
    
    const [postReports, postReportsTotal] = await Promise.all([
      db.forumPostReport.findMany({
        where: postReportsWhere,
        skip: postSkip,
        take: postTake,
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
      }),
      db.forumPostReport.count({ where: postReportsWhere }),
    ]);

    // Fetch reply reports
    const replyReportsWhere: any = status ? { status } : {};
    const replySkip = shouldFetchAll ? 0 : (type === "post" ? 0 : skip);
    const replyTake = shouldFetchAll ? undefined : (type === "post" ? 0 : limit);
    
    const [replyReports, replyReportsTotal] = await Promise.all([
      db.forumReplyReport.findMany({
        where: replyReportsWhere,
        skip: replySkip,
        take: replyTake,
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
      }),
      db.forumReplyReport.count({ where: replyReportsWhere }),
    ]);

    // Combine and format reports
    let allReports = [
      ...postReports.map((report) => ({
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
      ...replyReports.map((report) => ({
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

    // Calculate total - if type is "all", use combined total, otherwise use the specific type total
    const total = type === "all" 
      ? postReportsTotal + replyReportsTotal
      : (type === "post" ? postReportsTotal : replyReportsTotal);

    // If type is "all", we need to paginate the combined results
    if (type === "all") {
      allReports = allReports.slice(skip, skip + limit);
    }

    return NextResponse.json({
      reports: allReports,
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

