"use server";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { role: true, isForumAdmin: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.isForumAdmin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const isExport = searchParams.get("export") === "csv";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = isExport ? 10000 : Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "20", 10)));
    const statusFilter = searchParams.get("status") || "all";
    const priorityFilter = searchParams.get("priority") || "all";
    const reasonFilter = searchParams.get("reason") || "all";
    const searchQuery = searchParams.get("search") || "";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const sortField = searchParams.get("sortField") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const userFilter = searchParams.get("userFilter") || "all";
    const replyCountFilter = searchParams.get("replyCountFilter") || "all";

    const skip = isExport ? 0 : (page - 1) * limit;

    const where: Prisma.FeedbackWhereInput = {};
    
    if (statusFilter !== "all") {
      where.status = statusFilter;
    }
    
    if (priorityFilter !== "all") {
      where.priority = priorityFilter;
    }
    
    if (reasonFilter !== "all") {
      where.reason = reasonFilter;
    }
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }
    
    if (userFilter === "registered") {
      where.userId = { not: null };
    } else if (userFilter === "anonymous") {
      where.userId = null;
    }

    if (replyCountFilter === "with") {
      where.replies = { some: {} };
    } else if (replyCountFilter === "without") {
      where.replies = { none: {} };
    }

    if (searchQuery.trim()) {
      where.OR = [
        { message: { contains: searchQuery, mode: "insensitive" } },
        { reason: { contains: searchQuery, mode: "insensitive" } },
        { userEmail: { contains: searchQuery, mode: "insensitive" } },
        { user: { 
          OR: [
            { username: { contains: searchQuery, mode: "insensitive" } },
            { displayName: { contains: searchQuery, mode: "insensitive" } },
          ]
        } },
      ];
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortField === "priority") {
      // Priority order: Urgent > High > Medium > Low
      const priorityOrder = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
      // We'll need to handle this differently since Prisma doesn't support custom ordering easily
      // For now, use createdAt as fallback
      orderBy.createdAt = sortOrder;
    } else if (sortField === "status") {
      orderBy.status = sortOrder;
    } else if (sortField === "createdAt") {
      orderBy.createdAt = sortOrder;
    } else {
      orderBy.createdAt = "desc";
    }

    const [feedbacks, total] = await Promise.all([
      db.feedback.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          replies: {
            select: {
              id: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.feedback.count({ where }),
    ]);

    // Sort by priority if needed (client-side for custom ordering)
    let sortedFeedbacks = feedbacks;
    if (sortField === "priority") {
      const priorityOrder = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
      sortedFeedbacks = [...feedbacks].sort((a, b) => {
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        return sortOrder === "desc" ? bPriority - aPriority : aPriority - bPriority;
      });
    }

    // Add reply count to each feedback
    const feedbacksWithCount = sortedFeedbacks.map((feedback) => ({
      ...feedback,
      replyCount: feedback.replies.length,
    }));

    // Handle CSV export
    if (isExport) {
      const csvHeaders = [
        "ID",
        "User Email",
        "Username",
        "Display Name",
        "Reason",
        "Priority",
        "Status",
        "Message",
        "Reply Count",
        "Created At",
      ];
      
      const csvRows = feedbacksWithCount.map((feedback) => [
        feedback.id,
        feedback.userEmail,
        feedback.user?.username || "",
        feedback.user?.displayName || "",
        feedback.reason,
        feedback.priority,
        feedback.status,
        `"${feedback.message.replace(/"/g, '""')}"`, // Escape quotes in CSV
        feedback.replyCount || 0,
        new Date(feedback.createdAt).toISOString(),
      ]);
      
      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row) => row.join(",")),
      ].join("\n");
      
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="feedback-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      feedbacks: feedbacksWithCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[AdminFeedback] GET error", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

/**
 * Delete feedback items
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { role: true, isForumAdmin: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.isForumAdmin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { feedbackIds, deleteAll } = body;

    if (deleteAll) {
      await db.feedback.deleteMany({});
    } else if (feedbackIds && Array.isArray(feedbackIds) && feedbackIds.length > 0) {
      await db.feedback.deleteMany({
        where: {
          id: { in: feedbackIds },
        },
      });
    } else {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AdminFeedback] DELETE error", error);
    return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 });
  }
}

/**
 * Bulk update feedback status
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { role: true, isForumAdmin: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.isForumAdmin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { feedbackIds, status } = body;

    if (!feedbackIds || !Array.isArray(feedbackIds) || feedbackIds.length === 0) {
      return NextResponse.json(
        { error: "feedbackIds array is required" },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    await db.feedback.updateMany({
      where: {
        id: { in: feedbackIds },
      },
      data: {
        status,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AdminFeedback] PATCH error", error);
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
  }
}

