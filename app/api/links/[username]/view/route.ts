import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Start of day UTC for a given date */
function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * POST /api/links/[username]/view
 * Record a page view for the link page (called client-side when the public page loads).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<NextResponse<{ ok?: boolean } | { error: string }>> {
  try {
    const { username } = await params;
    if (!username?.trim()) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { username: username.trim() },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const today = startOfDayUTC(new Date());
    await db.linkPageDailyStat.upsert({
      where: {
        userId_date: { userId: user.id, date: today },
      },
      create: {
        userId: user.id,
        date: today,
        pageViews: 1,
        totalClicks: 0,
      },
      update: { pageViews: { increment: 1 } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Link page view API error:", error);
    return NextResponse.json(
      { error: "Failed to record view" },
      { status: 500 }
    );
  }
}
