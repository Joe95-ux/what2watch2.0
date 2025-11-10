import { NextRequest, NextResponse } from "next/server";
import { getSimilarMovies } from "@/lib/tmdb";

interface RouteParams {
  params: Promise<{ movieId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { movieId } = await params;
    const movieIdNum = parseInt(movieId, 10);
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);

    if (isNaN(movieIdNum)) {
      return NextResponse.json(
        { error: "Invalid movie ID" },
        { status: 400 }
      );
    }

    const result = await getSimilarMovies(movieIdNum, page);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("Similar movies API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch similar movies" },
      { status: 500 }
    );
  }
}

