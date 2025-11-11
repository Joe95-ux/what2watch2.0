import { NextRequest, NextResponse } from "next/server";
import { getTrendingTV, TMDBResponse, TMDBSeries } from "@/lib/tmdb";

const DEFAULT_TIME_WINDOW: "day" | "week" = "week";

export async function GET(
  request: NextRequest
): Promise<NextResponse<TMDBResponse<TMDBSeries> | { error: string }>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageParam = searchParams.get("page");
    const timeWindowParam = searchParams.get("timeWindow");

    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const timeWindow =
      timeWindowParam === "day" || timeWindowParam === "week"
        ? timeWindowParam
        : DEFAULT_TIME_WINDOW;

    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: "Invalid page parameter" },
        { status: 400 }
      );
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 15000);
    });

    let series: TMDBResponse<TMDBSeries>;
    try {
      series = await Promise.race([
        getTrendingTV(timeWindow, page),
        timeoutPromise,
      ]);
    } catch (error) {
      const isTimeout =
        error instanceof Error &&
        (error.message.includes("timeout") ||
          error.message.includes("Request timeout") ||
          error.message.includes("ETIMEDOUT") ||
          error.name === "AbortError");

      console.warn(
        `Trending TV ${isTimeout ? "timeout" : "error"}, returning empty results:`,
        error
      );
      return NextResponse.json(
        {
          page: 1,
          results: [],
          total_pages: 0,
          total_results: 0,
        },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "public, s-maxage=300, stale-while-revalidate=3600",
          },
        }
      );
    }

    return NextResponse.json(series, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Trending TV API error:", error);
    return NextResponse.json(
      {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=3600",
        },
      }
    );
  }
}


