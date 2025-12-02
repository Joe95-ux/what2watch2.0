import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch recently viewed items for the current user
export async function GET(request: NextRequest): Promise<NextResponse<{ items: unknown[]; hasMore: boolean; total: number } | { error: string }>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user by clerkId
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const skip = (page - 1) * pageSize;

    // Fetch total count
    const total = await db.recentlyViewed.count({
      where: { userId: user.id },
    });

    // Fetch recently viewed items, ordered by most recent first
    const recentlyViewed = await db.recentlyViewed.findMany({
      where: { userId: user.id },
      orderBy: { viewedAt: "desc" },
      skip,
      take: pageSize,
    });

    const hasMore = skip + recentlyViewed.length < total;

    return NextResponse.json({ 
      items: recentlyViewed,
      hasMore,
      total,
    });
  } catch (error) {
    console.error("Error fetching recently viewed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Add a recently viewed item
export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tmdbId, mediaType, title, posterPath, backdropPath, releaseDate, firstAirDate } = body;

    if (!tmdbId || !mediaType || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find user by clerkId
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Use upsert to atomically create or update - prevents write conflicts
    // Retry logic for MongoDB transaction conflicts (P2034)
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await db.recentlyViewed.upsert({
          where: {
            userId_tmdbId_mediaType: {
              userId: user.id,
              tmdbId: parseInt(tmdbId.toString(), 10),
              mediaType: mediaType as string,
            },
          },
          update: {
            viewedAt: new Date(),
            // Also update metadata in case it changed
            title: title as string,
            posterPath: posterPath || null,
            backdropPath: backdropPath || null,
            releaseDate: releaseDate || null,
            firstAirDate: firstAirDate || null,
          },
          create: {
            userId: user.id,
            tmdbId: parseInt(tmdbId.toString(), 10),
            mediaType: mediaType as string,
            title: title as string,
            posterPath: posterPath || null,
            backdropPath: backdropPath || null,
            releaseDate: releaseDate || null,
            firstAirDate: firstAirDate || null,
          },
        });
        // Success - return early
        return NextResponse.json({ success: true });
      } catch (error: unknown) {
        // Check if it's a transaction conflict error (P2034)
        const isConflictError =
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "P2034";

        if (isConflictError && attempt < maxRetries - 1) {
          // Exponential backoff: 50ms, 100ms, 200ms
          const delay = Math.min(50 * Math.pow(2, attempt), 200);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        // If it's not a P2034 error or we've exhausted retries, throw
        throw error;
      }
    }

    // This should never be reached, but TypeScript needs it
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding recently viewed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Clear all recently viewed items for the current user
export async function DELETE(): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user by clerkId
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete all recently viewed items for this user
    await db.recentlyViewed.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing recently viewed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

