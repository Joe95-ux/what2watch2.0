import { NextRequest, NextResponse } from "next/server";
import { getCollectionDetails } from "@/lib/tmdb";

interface RouteParams {
  params: Promise<{ collectionId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<any | { error: string }>> {
  try {
    const { collectionId } = await params;
    const collectionIdNum = parseInt(collectionId, 10);

    if (isNaN(collectionIdNum)) {
      return NextResponse.json(
        { error: "Invalid collection ID" },
        { status: 400 }
      );
    }

    // Add timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 15000);
    });

    const detailsPromise = getCollectionDetails(collectionIdNum);

    let details: any;
    try {
      details = await Promise.race([detailsPromise, timeoutPromise]);
    } catch (error) {
      console.warn("Collection details timeout or error:", error);
      return NextResponse.json(
        { error: "Failed to fetch collection details" },
        { status: 500 }
      );
    }

    return NextResponse.json(details, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("Collection details API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch collection details";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
