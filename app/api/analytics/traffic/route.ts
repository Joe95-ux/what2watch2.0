import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { startOfDay, endOfDay, subDays } from "date-fns";
import type { Prisma } from "@prisma/client";

/** MongoDB aggregations can exceed RAM without disk spill; Prisma groupBy does not set allowDiskUse. */
const AGGREGATE_OPTIONS: Prisma.InputJsonValue = { allowDiskUse: true };

function asArray<T>(value: Prisma.JsonValue | null | undefined): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

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
      let days = parseInt(range || "30", 10);
      if (!Number.isFinite(days) || days < 1) days = 30;
      if (days > 366) days = 366;
      startDate = startOfDay(subDays(now, days));
      endDate = endOfDay(now);
    }

    const createdAtMatch = {
      createdAt: {
        $gte: { $date: startDate.toISOString() },
        $lte: { $date: endDate.toISOString() },
      },
    };

    // Total page views (no $group — stays cheap)
    const totalViews = await db.pageView.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Unique visitors — $group can be large; allowDiskUse avoids QueryExceededMemoryLimitNoDiskUseAllowed
    const uniqueVisitorsRaw = await db.pageView.aggregateRaw({
      pipeline: [
        { $match: createdAtMatch },
        { $group: { _id: "$visitorToken" } },
        { $count: "count" },
      ],
      options: AGGREGATE_OPTIONS,
    });
    const uniqueVisitorsRows = asArray<{ count?: number }>(uniqueVisitorsRaw);
    const uniqueVisitors = uniqueVisitorsRows[0]?.count ?? 0;

    const uniqueSessionsRaw = await db.pageView.aggregateRaw({
      pipeline: [
        {
          $match: {
            ...createdAtMatch,
            sessionId: { $ne: null },
          },
        },
        { $group: { _id: "$sessionId" } },
        { $count: "count" },
      ],
      options: AGGREGATE_OPTIONS,
    });
    const uniqueSessionsRows = asArray<{ count?: number }>(uniqueSessionsRaw);
    const uniqueSessions = uniqueSessionsRows[0]?.count ?? 0;

    const topPagesRaw = await db.pageView.aggregateRaw({
      pipeline: [
        { $match: createdAtMatch },
        { $group: { _id: "$path", views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 10 },
      ],
      options: AGGREGATE_OPTIONS,
    });
    const topPages = asArray<{ _id?: string; views?: number }>(topPagesRaw).map(
      (p) => ({
        path: p._id ?? "",
        views: typeof p.views === "number" ? p.views : 0,
      }),
    );

    const countryBreakdownRaw = await db.pageView.aggregateRaw({
      pipeline: [
        {
          $match: {
            ...createdAtMatch,
            country: { $ne: null },
          },
        },
        { $group: { _id: "$country", views: { $sum: 1 } } },
        { $sort: { views: -1 } },
      ],
      options: AGGREGATE_OPTIONS,
    });
    const countries = asArray<{ _id?: string | null; views?: number }>(
      countryBreakdownRaw,
    ).map((c) => ({
      country: c._id ?? null,
      views: typeof c.views === "number" ? c.views : 0,
    }));

    const sourceBreakdownRaw = await db.pageView.aggregateRaw({
      pipeline: [
        {
          $match: {
            ...createdAtMatch,
            referrerDomain: { $ne: null },
          },
        },
        { $group: { _id: "$referrerDomain", views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 20 },
      ],
      options: AGGREGATE_OPTIONS,
    });
    const sources = asArray<{ _id?: string | null; views?: number }>(
      sourceBreakdownRaw,
    ).map((s) => ({
      domain: s._id ?? null,
      views: typeof s.views === "number" ? s.views : 0,
    }));

    const utmSourceBreakdownRaw = await db.pageView.aggregateRaw({
      pipeline: [
        {
          $match: {
            ...createdAtMatch,
            utmSource: { $ne: null },
          },
        },
        { $group: { _id: "$utmSource", views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 20 },
      ],
      options: AGGREGATE_OPTIONS,
    });
    const utmSources = asArray<{ _id?: string | null; views?: number }>(
      utmSourceBreakdownRaw,
    ).map((u) => ({
      source: u._id ?? null,
      views: typeof u.views === "number" ? u.views : 0,
    }));

    const deviceBreakdownRaw = await db.pageView.aggregateRaw({
      pipeline: [
        {
          $match: {
            ...createdAtMatch,
            deviceType: { $ne: null },
          },
        },
        { $group: { _id: "$deviceType", views: { $sum: 1 } } },
        { $sort: { views: -1 } },
      ],
      options: AGGREGATE_OPTIONS,
    });
    const devices = asArray<{ _id?: string | null; views?: number }>(
      deviceBreakdownRaw,
    ).map((d) => ({
      deviceType: d._id ?? null,
      views: typeof d.views === "number" ? d.views : 0,
    }));

    const trendRaw = await db.pageView.aggregateRaw({
      pipeline: [
        { $match: createdAtMatch },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            views: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ],
      options: AGGREGATE_OPTIONS,
    });
    const trend = asArray<{ _id?: string; views?: number }>(trendRaw)
      .map((row) => ({
        date: row._id ?? "",
        views: typeof row.views === "number" ? row.views : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totals: {
        pageViews: totalViews,
        uniqueVisitors,
        uniqueSessions,
      },
      topPages,
      countries,
      sources,
      utmSources,
      devices,
      trend,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message === "Unauthorized" ||
      message.includes("Forbidden") ||
      message === "User not found"
    ) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("Traffic analytics error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch traffic analytics",
        ...(process.env.NODE_ENV === "development" && { details: message }),
      },
      { status: 500 },
    );
  }
}
