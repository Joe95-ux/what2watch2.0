import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma, AiChatIntent } from "@prisma/client";
import { db } from "@/lib/db";

const DEFAULT_RANGE_DAYS = 30;

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
        const fallbackDays = rangeDays || DEFAULT_RANGE_DAYS;
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

    // Get totals
    const [
      totalQueries,
      recommendationQueries,
      informationQueries,
      totalResults,
      totalClicks,
      totalPlaylistAdds,
      averageResponseTime,
      uniqueSessions,
    ] = await Promise.all([
      db.aiChatEvent.count({ where: whereClause }),
      db.aiChatEvent.count({
        where: { ...whereClause, intent: AiChatIntent.RECOMMENDATION },
      }),
      db.aiChatEvent.count({
        where: { ...whereClause, intent: AiChatIntent.INFORMATION },
      }),
      db.aiChatEvent.aggregate({
        where: whereClause,
        _sum: { resultsCount: true },
      }),
      db.aiChatEvent.aggregate({
        where: whereClause,
        _sum: { resultsClicked: true },
      }),
      db.aiChatEvent.aggregate({
        where: whereClause,
        _sum: { resultsAddedToPlaylist: true },
      }),
      db.aiChatEvent.aggregate({
        where: whereClause,
        _avg: { responseTime: true },
      }),
      db.aiChatEvent.findMany({
        where: whereClause,
        select: { sessionId: true },
        distinct: ["sessionId"],
      }),
    ]);

    // Get trend data (queries per day)
    // For MongoDB, we need to use aggregateRaw for date grouping
    const trendRaw = await db.aiChatEvent.aggregateRaw({
      pipeline: [
        ...(hasDateFilter && startDate && now
          ? [
              {
                $match: {
                  userId: { $oid: user.id },
                  createdAt: {
                    $gte: { $date: startDate.toISOString() },
                    $lte: { $date: now.toISOString() },
                  },
                },
              },
            ]
          : [{ $match: { userId: { $oid: user.id } } }]),
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ],
    });

    // Format trend data
    const trend = Array.isArray(trendRaw)
      ? trendRaw.map((item: { _id?: string; count?: number }) => ({
          date: item._id || "",
          count: typeof item.count === "number" ? item.count : 0,
        }))
      : [];

    // Get most common genres
    const genreEvents = await db.aiChatEvent.findMany({
      where: whereClause,
      select: { extractedGenres: true },
    });

    const genreCounts: Record<number, number> = {};
    genreEvents.forEach((event) => {
      if (Array.isArray(event.extractedGenres)) {
        event.extractedGenres.forEach((genreId: number) => {
          genreCounts[genreId] = (genreCounts[genreId] || 0) + 1;
        });
      }
    });

    const topGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([genreId, count]) => ({
        genreId: parseInt(genreId, 10),
        count,
      }));

    // Get most common keywords
    const keywordEvents = await db.aiChatEvent.findMany({
      where: whereClause,
      select: { extractedKeywords: true },
    });

    const keywordCounts: Record<string, number> = {};
    keywordEvents.forEach((event) => {
      if (Array.isArray(event.extractedKeywords)) {
        event.extractedKeywords.forEach((keyword: string) => {
          const lower = keyword.toLowerCase();
          keywordCounts[lower] = (keywordCounts[lower] || 0) + 1;
        });
      }
    });

    const topKeywords = Object.entries(keywordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));

    return NextResponse.json({
      totals: {
        totalQueries,
        recommendationQueries,
        informationQueries,
        totalResults: totalResults._sum.resultsCount || 0,
        totalClicks: totalClicks._sum.resultsClicked || 0,
        totalPlaylistAdds: totalPlaylistAdds._sum.resultsAddedToPlaylist || 0,
        averageResponseTime: averageResponseTime._avg.responseTime
          ? Math.round(averageResponseTime._avg.responseTime)
          : 0,
        uniqueSessions: uniqueSessions.length,
      },
      trend,
      topGenres,
      topKeywords,
      range: hasDateFilter && startDate && now
        ? {
            start: startDate.toISOString(),
            end: now.toISOString(),
          }
        : {
            start: null,
            end: new Date().toISOString(),
          },
    });
  } catch (error) {
    console.error("AI analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

