import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ playlistId: string }>;
}

// POST - Add item to playlist
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<{ success: boolean; item?: unknown } | { error: string }>> {
  try {
    const { userId } = await auth();
    const { playlistId } = await params;

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

    // Check if playlist exists and user owns it
    const playlist = await db.playlist.findUnique({
      where: { id: playlistId },
      include: {
        items: true,
      },
    });

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    if (playlist.userId !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Check if item already exists
    const existingItem = await db.playlistItem.findUnique({
      where: {
        playlistId_tmdbId_mediaType: {
          playlistId,
          tmdbId,
          mediaType,
        },
      },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: "Item already in playlist" },
        { status: 400 }
      );
    }

    // Get the highest order value and add 1
    const maxOrder = playlist.items.length > 0
      ? Math.max(...playlist.items.map((item) => item.order))
      : -1;

    const item = await db.playlistItem.create({
      data: {
        playlistId,
        tmdbId,
        mediaType,
        title,
        posterPath: posterPath || null,
        backdropPath: backdropPath || null,
        releaseDate: releaseDate || null,
        firstAirDate: firstAirDate || null,
        order: maxOrder + 1,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Add playlist item API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to add item to playlist";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from playlist
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const { userId } = await auth();
    const { playlistId } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { error: "Missing itemId" },
        { status: 400 }
      );
    }

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

    // Check if playlist exists and user owns it
    const playlist = await db.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    if (playlist.userId !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    await db.playlistItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove playlist item API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to remove item from playlist";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

