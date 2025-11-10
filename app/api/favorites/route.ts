import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch user's favorites
export async function GET(): Promise<NextResponse<{ favorites: unknown[] } | { error: string }>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const favorites = await db.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error("Get favorites API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch favorites";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Add a favorite
export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean; favorite?: unknown } | { error: string }>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tmdbId, mediaType, title, posterPath, backdropPath, releaseDate, firstAirDate } = body;

    if (!tmdbId || !mediaType || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if already favorited
    const existing = await db.favorite.findUnique({
      where: {
        userId_tmdbId_mediaType: {
          userId: user.id,
          tmdbId,
          mediaType,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, favorite: existing });
    }

    const favorite = await db.favorite.create({
      data: {
        userId: user.id,
        tmdbId,
        mediaType,
        title,
        posterPath: posterPath || null,
        backdropPath: backdropPath || null,
        releaseDate: releaseDate || null,
        firstAirDate: firstAirDate || null,
      },
    });

    return NextResponse.json({ success: true, favorite });
  } catch (error) {
    console.error("Add favorite API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to add favorite";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Remove a favorite
export async function DELETE(request: NextRequest): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get("tmdbId");
    const mediaType = searchParams.get("mediaType");

    if (!tmdbId || !mediaType) {
      return NextResponse.json(
        { error: "Missing tmdbId or mediaType" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    await db.favorite.deleteMany({
      where: {
        userId: user.id,
        tmdbId: parseInt(tmdbId, 10),
        mediaType,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete favorite API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete favorite";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

