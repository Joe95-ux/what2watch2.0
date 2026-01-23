import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Check all active alerts and trigger notifications
 * This endpoint should be called by a cron job
 * GET /api/youtube/alerts/check?secret=CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    // Verify cron secret
    if (!cronSecret || secret !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all active alerts
    const activeAlerts = await db.trendAlert.findMany({
      where: {
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    if (activeAlerts.length === 0) {
      return NextResponse.json({
        message: "No active alerts to check",
        triggered: 0,
      });
    }

    // Get recent trends (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTrends = await db.youTubeTrend.findMany({
      where: {
        period: "daily",
        startDate: { gte: oneDayAgo },
      },
      orderBy: {
        momentum: "desc",
      },
    });

    const triggeredAlerts: Array<{
      alertId: string;
      keyword: string;
      momentum: number;
      searchVolume: number;
    }> = [];

    // Check each alert against trends
    for (const alert of activeAlerts) {
      const matchingTrend = recentTrends.find(
        (trend) =>
          trend.keyword.toLowerCase() === alert.keyword.toLowerCase() &&
          trend.momentum >= alert.minMomentum &&
          trend.searchVolume >= alert.minSearchVolume &&
          (!alert.category || trend.category === alert.category)
      );

      if (matchingTrend) {
        // Check if we should trigger (avoid duplicate triggers within 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const shouldTrigger =
          !alert.lastTriggered || alert.lastTriggered < oneDayAgo;

        if (shouldTrigger) {
          // Update alert with trigger info
          await db.trendAlert.update({
            where: { id: alert.id },
            data: {
              lastTriggered: new Date(),
              triggerCount: alert.triggerCount + 1,
            },
          });

          triggeredAlerts.push({
            alertId: alert.id,
            keyword: alert.keyword,
            momentum: matchingTrend.momentum,
            searchVolume: matchingTrend.searchVolume,
          });

          // TODO: Send notification (email/push) to user
          // This would integrate with your notification system
        }
      }
    }

    return NextResponse.json({
      message: `Checked ${activeAlerts.length} alerts, triggered ${triggeredAlerts.length}`,
      triggered: triggeredAlerts.length,
      alerts: triggeredAlerts,
    });
  } catch (error) {
    console.error("Error checking trend alerts:", error);
    return NextResponse.json(
      { error: "Failed to check trend alerts" },
      { status: 500 }
    );
  }
}
