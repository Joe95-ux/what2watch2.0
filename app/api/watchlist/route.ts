import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch user's watchlist
export async function GET(request: NextRequest): Promise<NextResponse<{ watchlist: unknown[] } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const watchlist = await db.watchlistItem.findMany({
      where: { userId: user.id },
      orderBy: [
        { order: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ watchlist });
  } catch (error) {
    console.error("Get watchlist API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch watchlist";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Add item to watchlist
export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean; watchlistItem?: unknown } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { tmdbId, mediaType, title, posterPath, backdropPath, releaseDate, firstAirDate } = body;

    if (!tmdbId || !mediaType || !title) {
      return NextResponse.json(
        { error: "Missing required fields: tmdbId, mediaType, title" },
        { status: 400 }
      );
    }

    // Check if already in watchlist
    const existing = await db.watchlistItem.findUnique({
      where: {
        userId_tmdbId_mediaType: {
          userId: user.id,
          tmdbId,
          mediaType,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, watchlistItem: existing });
    }

    // Get the highest order value and add 1, or set to 0 if no items have order
    const maxOrderItem = await db.watchlistItem.findFirst({
      where: { userId: user.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const newOrder = maxOrderItem && maxOrderItem.order > 0 ? maxOrderItem.order + 1 : 0;

    const watchlistItem = await db.watchlistItem.create({
      data: {
        userId: user.id,
        tmdbId,
        mediaType,
        title,
        posterPath: posterPath || null,
        backdropPath: backdropPath || null,
        releaseDate: releaseDate || null,
        firstAirDate: firstAirDate || null,
        order: newOrder,
      },
    });

    return NextResponse.json({ success: true, watchlistItem });
  } catch (error) {
    console.error("Add to watchlist API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to add to watchlist";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from watchlist
export async function DELETE(request: NextRequest): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get("tmdbId");
    const mediaType = searchParams.get("mediaType");

    if (!tmdbId || !mediaType) {
      return NextResponse.json(
        { error: "Missing required parameters: tmdbId, mediaType" },
        { status: 400 }
      );
    }

    await db.watchlistItem.delete({
      where: {
        userId_tmdbId_mediaType: {
          userId: user.id,
          tmdbId: parseInt(tmdbId, 10),
          mediaType,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove from watchlist API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to remove from watchlist";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

