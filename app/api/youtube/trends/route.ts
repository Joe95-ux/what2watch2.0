import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Get trending keywords and topics
 * GET /api/youtube/trends?period=daily&limit=20&category=tech
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "daily";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const category = searchParams.get("category") || undefined;
    const minMomentum = parseFloat(searchParams.get("minMomentum") || "0");

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (period) {
      case "daily":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "weekly":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Build where clause
    const where: any = {
      period,
      startDate: { gte: startDate },
      endDate: { lte: endDate },
      momentum: { gte: minMomentum },
    };

    if (category) {
      where.category = category;
    }

    // Fetch trends
    const trends = await db.youTubeTrend.findMany({
      where,
      orderBy: { momentum: "desc" },
      take: limit,
    });

    return NextResponse.json({
      trends: trends.map((t) => ({
        id: t.id,
        keyword: t.keyword,
        category: t.category,
        searchVolume: t.searchVolume,
        videoCount: t.videoCount,
        avgViews: t.avgViews,
        avgEngagement: t.avgEngagement,
        momentum: t.momentum,
        period: t.period,
        startDate: t.startDate,
        endDate: t.endDate,
      })),
      period,
      count: trends.length,
    });
  } catch (error) {
    console.error("Error fetching trends:", error);
    return NextResponse.json(
      { error: "Failed to fetch trends" },
      { status: 500 }
    );
  }
}
