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

    // Get total feedback count
    const total = await db.feedback.count();

    // Get feedback by status
    const byStatus = await db.feedback.groupBy({
      by: ["status"],
      _count: true,
    });

    // Get feedback by priority
    const byPriority = await db.feedback.groupBy({
      by: ["priority"],
      _count: true,
    });

    // Get feedback with replies count
    const withReplies = await db.feedback.count({
      where: {
        replies: {
          some: {},
        },
      },
    });

    const withoutReplies = total - withReplies;

    // Get recent feedback (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = await db.feedback.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Get feedback by status formatted
    const statusStats = {
      OPEN: byStatus.find((s) => s.status === "OPEN")?._count || 0,
      IN_PROGRESS: byStatus.find((s) => s.status === "IN_PROGRESS")?._count || 0,
      RESOLVED: byStatus.find((s) => s.status === "RESOLVED")?._count || 0,
      CLOSED: byStatus.find((s) => s.status === "CLOSED")?._count || 0,
    };

    // Get feedback by priority formatted
    const priorityStats = {
      Urgent: byPriority.find((p) => p.priority === "Urgent")?._count || 0,
      High: byPriority.find((p) => p.priority === "High")?._count || 0,
      Medium: byPriority.find((p) => p.priority === "Medium")?._count || 0,
      Low: byPriority.find((p) => p.priority === "Low")?._count || 0,
    };

    // Get trend data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const allFeedback = await db.feedback.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
        status: true,
        replies: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 1,
        },
      },
    });

    // Group by date
    const trendsMap = new Map<string, { count: number; open: number; resolved: number }>();
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      trendsMap.set(dateStr, { count: 0, open: 0, resolved: 0 });
    }

    allFeedback.forEach((feedback) => {
      const dateStr = feedback.createdAt.toISOString().split("T")[0];
      const trend = trendsMap.get(dateStr);
      if (trend) {
        trend.count++;
        if (feedback.status === "OPEN" || feedback.status === "IN_PROGRESS") {
          trend.open++;
        }
        if (feedback.status === "RESOLVED" || feedback.status === "CLOSED") {
          trend.resolved++;
        }
      }
    });

    const trends = Array.from(trendsMap.entries()).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      ...data,
    }));

    // Get insights
    const oldestUnresolved = await db.feedback.findFirst({
      where: {
        status: {
          in: ["OPEN", "IN_PROGRESS"],
        },
        replies: {
          none: {},
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        message: true,
        createdAt: true,
      },
    });

    let oldestUnresolvedDays = 0;
    if (oldestUnresolved) {
      const daysDiff = Math.floor(
        (new Date().getTime() - new Date(oldestUnresolved.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      oldestUnresolvedDays = daysDiff;
    }

    // Calculate average response time (hours)
    const feedbackWithReplies = await db.feedback.findMany({
      where: {
        replies: {
          some: {},
        },
      },
      select: {
        createdAt: true,
        replies: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 1,
        },
      },
    });

    let totalResponseTime = 0;
    let responseCount = 0;
    feedbackWithReplies.forEach((feedback) => {
      if (feedback.replies.length > 0) {
        const responseTime = feedback.replies[0].createdAt.getTime() - feedback.createdAt.getTime();
        totalResponseTime += responseTime;
        responseCount++;
      }
    });

    const averageResponseTime = responseCount > 0
      ? Math.round(totalResponseTime / responseCount / (1000 * 60 * 60))
      : 0;

    // Get urgent without replies
    const urgentWithoutReplies = await db.feedback.count({
      where: {
        priority: "Urgent",
        replies: {
          none: {},
        },
      },
    });

    return NextResponse.json({
      total,
      recent,
      withReplies,
      withoutReplies,
      byStatus: statusStats,
      byPriority: priorityStats,
      trends,
      insights: {
        oldestUnresolved: oldestUnresolved
          ? {
              id: oldestUnresolved.id,
              message: oldestUnresolved.message,
              createdAt: oldestUnresolved.createdAt.toISOString(),
              daysOld: oldestUnresolvedDays,
            }
          : undefined,
        averageResponseTime,
        responseRate: total > 0 ? Math.round((withReplies / total) * 100) : 0,
        urgentWithoutReplies,
      },
    });
  } catch (error) {
    console.error("[AdminStats] GET error", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

