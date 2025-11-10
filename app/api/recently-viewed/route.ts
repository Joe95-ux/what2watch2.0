import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch recently viewed items for the current user
export async function GET(): Promise<NextResponse<{ items: unknown[] } | { error: string }>> {
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

    // Fetch recently viewed items, ordered by most recent first, limit to 20
    const recentlyViewed = await db.recentlyViewed.findMany({
      where: { userId: user.id },
      orderBy: { viewedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ items: recentlyViewed });
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

    // Check if this item already exists for this user
    const existing = await db.recentlyViewed.findUnique({
      where: {
        userId_tmdbId_mediaType: {
          userId: user.id,
          tmdbId: parseInt(tmdbId.toString(), 10),
          mediaType: mediaType as string,
        },
      },
    });

    if (existing) {
      // Update the viewedAt timestamp
      await db.recentlyViewed.update({
        where: { id: existing.id },
        data: { viewedAt: new Date() },
      });
    } else {
      // Create new entry
      await db.recentlyViewed.create({
        data: {
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
    }

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

