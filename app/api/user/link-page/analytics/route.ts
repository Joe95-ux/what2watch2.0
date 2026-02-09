import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from "date-fns";

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

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

    const { searchParams } = request.nextUrl;
    const range = searchParams.get("range");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    let from: Date;
    let to: Date;

    if (fromParam && toParam) {
      from = startOfDay(new Date(fromParam));
      to = endOfDay(new Date(toParam));
    } else {
      const now = new Date();
      to = endOfDay(now);
      const days = range === "7" ? 7 : range === "90" ? 90 : range === "365" ? 365 : 30;
      from = startOfDay(subDays(now, days));
    }

    const fromUTC = startOfDayUTC(from);
    const toUTC = startOfDayUTC(to);

    const [dailyStats, notifications, links] = await Promise.all([
      db.linkPageDailyStat.findMany({
        where: {
          userId: user.id,
          date: { gte: fromUTC, lte: toUTC },
        },
        orderBy: { date: "asc" },
        select: { date: true, pageViews: true, totalClicks: true },
      }),
      db.linkPagePeakNotification.findMany({
        where: {
          userId: user.id,
          date: { gte: fromUTC, lte: toUTC },
        },
        select: { date: true },
      }),
      db.userLink.findMany({
        where: { userId: user.id },
        orderBy: { order: "asc" },
        select: { id: true, label: true, url: true, clicks: true },
      }),
    ]);

    const daysInRange = eachDayOfInterval({ start: from, end: to });
    const statByDate = new Map(
      dailyStats.map((s) => [format(s.date, "yyyy-MM-dd"), s])
    );
    const daily = daysInRange.map((day) => {
      const key = format(day, "yyyy-MM-dd");
      const stat = statByDate.get(key);
      const views = stat?.pageViews ?? 0;
      const clicks = stat?.totalClicks ?? 0;
      const ctr = views > 0 ? (clicks / views) * 100 : 0;
      return {
        date: format(day, "MMM d"),
        dateKey: key,
        totalViews: views,
        uniqueViews: views,
        totalClicks: clicks,
        uniqueClicks: clicks,
        ctr: Math.round(ctr * 100) / 100,
      };
    });

    const totalViews = dailyStats.reduce((s, d) => s + d.pageViews, 0);
    const totalClicks = dailyStats.reduce((s, d) => s + d.totalClicks, 0);
    const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

    const notificationSentDates = [
      ...new Set(notifications.map((n) => format(n.date, "yyyy-MM-dd"))),
    ];

    return NextResponse.json({
      totals: {
        views: totalViews,
        clicks: totalClicks,
        ctr: Math.round(ctr * 100) / 100,
        avgTimeToClick: null as number | null,
      },
      daily,
      notificationSentDates,
      links,
    });
  } catch (error) {
    console.error("Link page analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
