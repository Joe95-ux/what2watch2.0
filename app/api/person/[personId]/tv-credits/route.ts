import { NextRequest, NextResponse } from "next/server";
import { getPersonTVCredits } from "@/lib/tmdb";

interface RouteParams {
  params: Promise<{
    personId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { personId } = await params;
    const personIdNum = parseInt(personId, 10);

    if (isNaN(personIdNum)) {
      return NextResponse.json(
        { error: "Invalid person ID" },
        { status: 400 }
      );
    }

    const credits = await getPersonTVCredits(personIdNum);

    return NextResponse.json(credits, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("Person TV credits API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch person TV credits";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

