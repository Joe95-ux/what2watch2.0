import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { startOfDay, endOfDay, subDays } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    
    if (fromParam && toParam) {
      startDate = startOfDay(new Date(fromParam));
      endDate = endOfDay(new Date(toParam));
    } else if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      // Parse range as number (days) for backward compatibility
      const days = parseInt(range || "30", 10);
      startDate = startOfDay(subDays(now, days));
      endDate = endOfDay(now);
    }
    
    // Total page views
    const totalViews = await db.pageView.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    
    // Unique visitors
    const uniqueVisitors = await db.pageView.groupBy({
      by: ["visitorToken"],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    
    // Unique sessions
    const uniqueSessions = await db.pageView.groupBy({
      by: ["sessionId"],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        sessionId: { not: null },
      },
    });
    
    // Top pages
    const topPages = await db.pageView.groupBy({
      by: ["path"],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 10,
    });
    
    // Country breakdown
    const countryBreakdown = await db.pageView.groupBy({
      by: ["country"],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        country: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });
    
    // Source breakdown (referrer domain)
    const sourceBreakdown = await db.pageView.groupBy({
      by: ["referrerDomain"],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        referrerDomain: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 20,
    });
    
    // UTM source breakdown
    const utmSourceBreakdown = await db.pageView.groupBy({
      by: ["utmSource"],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        utmSource: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 20,
    });
    
    // Device type breakdown
    const deviceBreakdown = await db.pageView.groupBy({
      by: ["deviceType"],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        deviceType: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });
    
    // Daily trend
    const dailyTrend = await db.pageView.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
      },
    });
    
    // Group by day
    const trendMap = new Map<string, number>();
    dailyTrend.forEach((view) => {
      const date = new Date(view.createdAt).toISOString().split("T")[0];
      trendMap.set(date, (trendMap.get(date) || 0) + 1);
    });
    
    const trend = Array.from(trendMap.entries())
      .map(([date, count]) => ({ date, views: count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return NextResponse.json({
      totals: {
        pageViews: totalViews,
        uniqueVisitors: uniqueVisitors.length,
        uniqueSessions: uniqueSessions.length,
      },
      topPages: topPages.map((p) => ({
        path: p.path,
        views: p._count.id,
      })),
      countries: countryBreakdown.map((c) => ({
        country: c.country,
        views: c._count.id,
      })),
      sources: sourceBreakdown.map((s) => ({
        domain: s.referrerDomain,
        views: s._count.id,
      })),
      utmSources: utmSourceBreakdown.map((u) => ({
        source: u.utmSource,
        views: u._count.id,
      })),
      devices: deviceBreakdown.map((d) => ({
        deviceType: d.deviceType,
        views: d._count.id,
      })),
      trend,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Traffic analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch traffic analytics" },
      { status: 500 }
    );
  }
}

