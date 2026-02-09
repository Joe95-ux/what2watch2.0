import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Start of day UTC */
function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * GET /api/links/click?linkId=xxx
 * Increments the link's click count and redirects to the link URL.
 * Also increments daily totalClicks for the link page owner.
 */
export async function GET(request: NextRequest) {
  try {
    const linkId = request.nextUrl.searchParams.get("linkId");
    if (!linkId?.trim()) {
      return NextResponse.redirect(new URL("/", request.url), 302);
    }

    const link = await db.userLink.findUnique({
      where: { id: linkId.trim() },
      select: { id: true, url: true, userId: true },
    });

    if (!link?.url) {
      return NextResponse.redirect(new URL("/", request.url), 302);
    }

    const today = startOfDayUTC(new Date());
    await Promise.all([
      db.userLink.update({
        where: { id: link.id },
        data: { clicks: { increment: 1 } },
      }),
      db.linkPageDailyStat.upsert({
        where: {
          userId_date: { userId: link.userId, date: today },
        },
        create: {
          userId: link.userId,
          date: today,
          pageViews: 0,
          totalClicks: 1,
        },
        update: { totalClicks: { increment: 1 } },
      }),
    ]);

    return NextResponse.redirect(link.url, 302);
  } catch {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }
}
