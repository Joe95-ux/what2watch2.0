import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch public playlists (no authentication required)
export async function GET(request: NextRequest): Promise<NextResponse<{ playlists: unknown[]; currentUserId?: string } | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const limitNum = limit ? parseInt(limit, 10) : 20;

    // Get current user if authenticated (for ownership checks)
    const { userId: clerkUserId } = await auth();
    let currentUserId: string | undefined;
    if (clerkUserId) {
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
      currentUserId = user?.id;
    }

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
          take: 3, // Get up to 3 items for poster grid
          orderBy: { order: "asc" },
          select: {
            order: true,
            posterPath: true,
          },
        },
        youtubeItems: {
          take: 3, // Get up to 3 YouTube items for poster grid
          orderBy: { order: "asc" },
          select: {
            order: true,
            thumbnail: true,
          },
        },
        _count: {
          select: { 
            items: true,
            youtubeItems: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limitNum,
    });

    return NextResponse.json(
      { playlists, currentUserId },
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

