import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const RETENTION_DAYS = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";

    if (!isVercelCron && (!cronSecret || secret !== cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const [snapshots, trends, analyses] = await Promise.all([
      db.youTubeVideoSnapshot.deleteMany({
        where: { collectedAt: { lt: cutoff } },
      }),
      db.youTubeTrend.deleteMany({
        where: { endDate: { lt: cutoff } },
      }),
      db.youTubeVideoAnalysis.deleteMany({
        where: { analyzedAt: { lt: cutoff } },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      retentionDays: RETENTION_DAYS,
      cutoff: cutoff.toISOString(),
      deleted: {
        snapshots: snapshots.count,
        trends: trends.count,
        analyses: analyses.count,
      },
    });
  } catch (error) {
    console.error("youtube compliance retention cleanup error:", error);
    return NextResponse.json({ error: "Failed to run retention cleanup" }, { status: 500 });
  }
}
