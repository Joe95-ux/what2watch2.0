"use server";

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
      select: { role: true, isForumAdmin: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.isForumAdmin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "20", 10)));
    const statusFilter = searchParams.get("status") || "all";

    const skip = (page - 1) * limit;

    const where: any = {};
    if (statusFilter !== "all") {
      where.status = statusFilter;
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
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.feedback.count({ where }),
    ]);

    return NextResponse.json({
      feedbacks,
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

