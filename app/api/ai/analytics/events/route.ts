import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma, AiChatIntent } from "@prisma/client";
import { db } from "@/lib/db";

const DEFAULT_PAGE_SIZE = 25;

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
    const pageSize = parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10);
    const rangeDaysParam = searchParams.get("range");
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");

    // Parse range days
    const rangeDays = rangeDaysParam ? parseInt(rangeDaysParam, 10) : null;
    const hasDateFilter = !!(rangeDays || startParam || endParam);

    let startDate: Date | null = null;
    let now: Date | null = null;

    if (hasDateFilter) {
      now = endParam ? new Date(endParam) : new Date();
      if (Number.isNaN(now.getTime())) {
        return NextResponse.json(
          { error: "Invalid endDate parameter" },
          { status: 400 }
        );
      }

      startDate = startParam ? new Date(startParam) : null;
      if (startDate && Number.isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid startDate parameter" },
          { status: 400 }
        );
      }

      if (!startDate && rangeDays) {
        startDate = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
      }

      // Ensure dates are reasonable
      const actualNow = new Date();
      if (now.getTime() > actualNow.getTime() + 24 * 60 * 60 * 1000) {
        now = actualNow;
      }

      if (startDate && startDate > now) {
        const fallbackDays = rangeDays || 30;
        startDate = new Date(now.getTime() - fallbackDays * 24 * 60 * 60 * 1000);
      }
    } else {
      now = new Date();
      startDate = null;
    }

    // Build where clause
    const whereClause: Prisma.AiChatEventWhereInput = {
      userId: user.id,
    };

    if (hasDateFilter && startDate && now) {
      whereClause.createdAt = {
        gte: startDate,
        lte: now,
      };
    }

    // Get total count
    const totalCount = await db.aiChatEvent.count({ where: whereClause });

    // Get paginated events
    const events = await db.aiChatEvent.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        sessionId: true,
        userMessage: true,
        intent: true,
        model: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        responseTime: true,
        resultsCount: true,
        createdAt: true,
      },
    });

    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      events,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("AI analytics events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics events" },
      { status: 500 }
    );
  }
}

