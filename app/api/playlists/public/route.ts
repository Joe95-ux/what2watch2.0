import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Fetch public playlists (no authentication required)
export async function GET(request: NextRequest): Promise<NextResponse<{ playlists: unknown[] } | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const limitNum = limit ? parseInt(limit, 10) : 20;

    // Fetch public playlists, ordered by most recently updated
    // Only include playlists that have at least one item
    const playlists = await db.playlist.findMany({
      where: {
        isPublic: true,
        items: {
          some: {}, // At least one item
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        items: {
          take: 1, // Only get first item for cover image
          orderBy: { order: "asc" },
          select: {
            posterPath: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limitNum,
    });

    return NextResponse.json(
      { playlists },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error("Get public playlists API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch public playlists";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

