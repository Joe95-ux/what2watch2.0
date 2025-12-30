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

    return NextResponse.json({
      total,
      recent,
      withReplies,
      withoutReplies,
      byStatus: statusStats,
      byPriority: priorityStats,
    });
  } catch (error) {
    console.error("[AdminStats] GET error", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

