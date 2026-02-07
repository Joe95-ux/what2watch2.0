import { NextResponse } from "next/server";
import { getWatchProvidersRegions } from "@/lib/tmdb";

/**
 * GET /api/watch-providers/regions
 * Returns TMDB watch provider regions (countries) for the country dropdown.
 */
export async function GET() {
  try {
    const data = await getWatchProvidersRegions();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (error) {
    console.error("Watch providers regions API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch regions" },
      { status: 500 }
    );
  }
}
