import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { subDays } from "date-fns";

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Cron: check for link page activity peaks and send push + email.
 * Call with GET/POST; optional Bearer CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  return runPeakCheck(request);
}

export async function POST(request: NextRequest) {
  return runPeakCheck(request);
}

async function runPeakCheck(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const yesterday = startOfDayUTC(subDays(now, 1));
    const sevenDaysAgo = startOfDayUTC(subDays(now, 8));

    const usersWithLinkPage = await db.user.findMany({
      where: { linkPage: { isNot: null } },
      select: { id: true, email: true, displayName: true, username: true },
    });

    let sent = 0;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://what2watch2-0.vercel.app";

    for (const user of usersWithLinkPage) {
      const [yesterdayStat, previousStats, alreadySent] = await Promise.all([
        db.linkPageDailyStat.findUnique({
          where: { userId_date: { userId: user.id, date: yesterday } },
          select: { pageViews: true, totalClicks: true },
        }),
        db.linkPageDailyStat.findMany({
          where: {
            userId: user.id,
            date: { gte: sevenDaysAgo, lt: yesterday },
          },
          select: { pageViews: true, totalClicks: true },
        }),
        db.linkPagePeakNotification.findFirst({
          where: { userId: user.id, date: yesterday },
        }),
      ]);

      if (alreadySent) continue;

      const yViews = yesterdayStat?.pageViews ?? 0;
      const yClicks = yesterdayStat?.totalClicks ?? 0;
      const avgViews = previousStats.length
        ? previousStats.reduce((s, d) => s + d.pageViews, 0) / previousStats.length
        : 0;
      const avgClicks = previousStats.length
        ? previousStats.reduce((s, d) => s + d.totalClicks, 0) / previousStats.length
        : 0;

      const viewsPeak = yViews >= 3 && (avgViews === 0 || yViews >= 1.5 * avgViews);
      const clicksPeak = yClicks >= 2 && (avgClicks === 0 || yClicks >= 1.5 * avgClicks);

      if (!viewsPeak && !clicksPeak) continue;

      const metric = viewsPeak && clicksPeak ? "views & clicks" : viewsPeak ? "views" : "clicks";
      const value = viewsPeak && clicksPeak ? yViews + yClicks : viewsPeak ? yViews : yClicks;

      await db.linkPagePeakNotification.create({
        data: {
          userId: user.id,
          date: yesterday,
          metric: viewsPeak && clicksPeak ? "views_clicks" : viewsPeak ? "views" : "clicks",
          value,
        },
      });

      const analyticsUrl = `${baseUrl}/dashboard/links/analytics`;
      const title = "Link page activity peak";
      const message = `Your link page had a spike in ${metric} yesterday. Check your analytics.`;

      await db.generalNotification.create({
        data: {
          userId: user.id,
          type: "LINK_PAGE_PEAK",
          title,
          message,
          linkUrl: analyticsUrl,
          metadata: { date: yesterday.toISOString(), metric, value },
        },
      });

      if (user.email) {
        const name = user.displayName || user.username || "there";
        await sendEmail({
          to: user.email,
          subject: "Your link page had a traffic peak",
          html: `
            <p>Hi ${name},</p>
            <p>Your link page had higher than usual ${metric} yesterday. Take a look at your analytics:</p>
            <p><a href="${analyticsUrl}">View link page analytics</a></p>
            <p>— What2Watch</p>
          `,
        });
      }

      sent++;
    }

    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    console.error("Link page peak notifications error:", error);
    return NextResponse.json(
      { error: "Peak check failed" },
      { status: 500 }
    );
  }
}
