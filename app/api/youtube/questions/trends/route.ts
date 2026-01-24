import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Get question trends (aggregated questions)
 * GET /api/youtube/questions/trends?category=tech&limit=20&minFrequency=2
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const minFrequency = parseInt(searchParams.get("minFrequency") || "2", 10);

    // Get question trends
    const trends = await db.questionTrend.findMany({
      where: {
        ...(category && { category }),
        frequency: { gte: minFrequency },
      },
      orderBy: {
        trendScore: "desc",
      },
      take: limit,
    });

    return NextResponse.json({
      trends,
      total: trends.length,
    });
  } catch (error) {
    console.error("Error fetching question trends:", error);
    return NextResponse.json(
      { error: "Failed to fetch question trends" },
      { status: 500 }
    );
  }
}
