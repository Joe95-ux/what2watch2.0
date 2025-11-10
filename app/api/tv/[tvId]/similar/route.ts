import { NextRequest, NextResponse } from "next/server";
import { getSimilarTV } from "@/lib/tmdb";

interface RouteParams {
  params: Promise<{ tvId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { tvId } = await params;
    const tvIdNum = parseInt(tvId, 10);
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);

    if (isNaN(tvIdNum)) {
      return NextResponse.json(
        { error: "Invalid TV ID" },
        { status: 400 }
      );
    }

    const result = await getSimilarTV(tvIdNum, page);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("Similar TV shows API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch similar TV shows" },
      { status: 500 }
    );
  }
}

