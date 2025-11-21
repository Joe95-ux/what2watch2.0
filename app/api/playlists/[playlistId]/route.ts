import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ playlistId: string }>;
}

// GET - Fetch a single playlist with items
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<{ playlist: unknown } | { error: string }>> {
  try {
    const { playlistId } = await params;
    const { searchParams } = new URL(request.url);
    const isPublicView = searchParams.get("public") === "true";

    // For public view, allow unauthenticated access
    if (isPublicView) {
      const { userId: clerkUserId } = await auth();
      let currentUserId: string | null = null;

      // If user is authenticated, get their database ID for owner check
      if (clerkUserId) {
        const currentUser = await db.user.findUnique({
          where: { clerkId: clerkUserId },
          select: { id: true },
        });
        currentUserId = currentUser?.id || null;
      }

      const playlist = await db.playlist.findUnique({
        where: { id: playlistId },
        include: {
          items: {
            orderBy: { order: "asc" },
          },
          youtubeItems: {
            orderBy: { order: "asc" },
          },
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
      });

      if (!playlist) {
        return NextResponse.json(
          { error: "Playlist not found" },
          { status: 404 }
        );
      }

      if (!playlist.isPublic) {
        return NextResponse.json(
          { error: "Playlist is private" },
          { status: 403 }
        );
      }

      return NextResponse.json({ 
        playlist,
        currentUserId, // Include current user ID if authenticated
      });
    }

    // For authenticated requests, require auth
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

    const playlist = await db.playlist.findUnique({
      where: { id: playlistId },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    // Check if user has access (owner or public)
    if (playlist.userId !== user.id && !playlist.isPublic) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({ 
      playlist,
      currentUserId: user.id, // Include current user's database ID for ownership checks
    });
  } catch (error) {
    console.error("Get playlist API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch playlist";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// PUT - Update a playlist
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<{ success: boolean; playlist?: unknown } | { error: string }>> {
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
    const { name, description, isPublic, coverImage, items } = body;

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
    const existingPlaylist = await db.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!existingPlaylist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    if (existingPlaylist.userId !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Update items if provided
    if (items !== undefined) {
      // Delete existing items
      await db.playlistItem.deleteMany({
        where: { playlistId },
      });

      // Create new items
      if (Array.isArray(items) && items.length > 0) {
        await db.playlistItem.createMany({
          data: items.map((item: {
            tmdbId: number;
            mediaType: "movie" | "tv";
            title: string;
            posterPath?: string | null;
            backdropPath?: string | null;
            releaseDate?: string | null;
            firstAirDate?: string | null;
            order?: number;
          }, index: number) => ({
            playlistId,
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath || null,
            backdropPath: item.backdropPath || null,
            releaseDate: item.releaseDate || null,
            firstAirDate: item.firstAirDate || null,
            order: item.order !== undefined ? item.order : index,
          })),
        });
      }
    }

    const playlist = await db.playlist.update({
      where: { id: playlistId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isPublic !== undefined && { isPublic }),
        ...(coverImage !== undefined && { coverImage: coverImage || null }),
      },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json({ success: true, playlist });
  } catch (error) {
    console.error("Update playlist API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update playlist";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete a playlist
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const { userId } = await auth();
    const { playlistId } = await params;

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
    const existingPlaylist = await db.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!existingPlaylist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    if (existingPlaylist.userId !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    await db.playlist.delete({
      where: { id: playlistId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete playlist API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete playlist";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

