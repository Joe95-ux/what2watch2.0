import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const EDITORIAL_TAG = "__editorial__";

function mapListForClient<T extends { tags?: string[] }>(list: T) {
  const tags = list.tags ?? [];
  const isEditorial = tags.includes(EDITORIAL_TAG);
  return {
    ...list,
    tags: tags.filter((tag) => tag !== EDITORIAL_TAG),
    isEditorial,
  };
}

// GET - Fetch public lists (no authentication required)
export async function GET(request: NextRequest): Promise<NextResponse<{ lists: unknown[]; currentUserId?: string } | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const editorialOnly = searchParams.get("editorialOnly") === "true";
    const relatedTmdbId = searchParams.get("tmdbId");
    const relatedMediaType = searchParams.get("mediaType");
    const relatedTmdbIdNum = relatedTmdbId ? parseInt(relatedTmdbId, 10) : null;

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

    // Fetch public lists, ordered by most recently updated
    // Only include lists that have at least one item
    const where: any = {
      visibility: "PUBLIC",
      items: {
        some: {}, // At least one item
      },
    };

    if (editorialOnly) {
      where.tags = { has: EDITORIAL_TAG };
    } else {
      where.tags = { hasNone: [EDITORIAL_TAG] };
    }

    if (
      relatedTmdbIdNum &&
      !Number.isNaN(relatedTmdbIdNum) &&
      (relatedMediaType === "movie" || relatedMediaType === "tv")
    ) {
      where.items = {
        some: {
          tmdbId: relatedTmdbIdNum,
          mediaType: relatedMediaType,
        },
      };
    }

    const lists = await db.list.findMany({
      where,
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
          take: 10, // Get more items to ensure we can find 3 with posters
          orderBy: { position: "asc" },
          select: {
            position: true,
            posterPath: true,
          },
        },
        _count: {
          select: {
            items: true,
            likedBy: true,
            comments: true,
          },
        },
        likedBy: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limitNum,
    });

    return NextResponse.json(
      { lists: lists.map(mapListForClient), currentUserId },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error("Get public lists API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch public lists";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

