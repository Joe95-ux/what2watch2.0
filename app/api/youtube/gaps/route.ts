import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Get stored content gaps
 * GET /api/youtube/gaps?category=tech&limit=20&minScore=5
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const minScore = parseFloat(searchParams.get("minScore") || "0");

    const gaps = await db.contentGap.findMany({
      where: {
        ...(category && { category }),
        gapScore: { gte: minScore },
      },
      orderBy: {
        gapScore: "desc",
      },
      take: limit,
    });

    return NextResponse.json({
      gaps: gaps.map((gap) => ({
        id: gap.id,
        keyword: gap.keyword,
        category: gap.category,
        searchVolume: gap.searchVolume,
        videoCount: gap.videoCount,
        avgVideoAge: gap.avgVideoAge,
        topVideoViews: gap.topVideoViews,
        gapScore: gap.gapScore,
        trendScore: gap.trendScore,
        discoveredAt: gap.discoveredAt,
      })),
      total: gaps.length,
    });
  } catch (error) {
    console.error("Error fetching content gaps:", error);
    return NextResponse.json(
      { error: "Failed to fetch content gaps" },
      { status: 500 }
    );
  }
}
