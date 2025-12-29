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

    const [feedbacks, total] = await Promise.all([
      db.feedback.findMany({
        where,
        include: {
          user: {
            select: {
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
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.feedback.count({ where }),
    ]);

    // Add reply count to each feedback
    const feedbacksWithCount = feedbacks.map((feedback) => ({
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

