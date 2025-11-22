import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch user's playlists
export async function GET(request: NextRequest): Promise<NextResponse<{ playlists: unknown[] } | { error: string }>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includePublic = searchParams.get("includePublic") === "true";

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const playlists = await db.playlist.findMany({
      where: includePublic
        ? {
            OR: [
              { userId: user.id },
              { isPublic: true },
            ],
          }
        : { userId: user.id },
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
          select: { 
            items: true,
            youtubeItems: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ playlists });
  } catch (error) {
    console.error("Get playlists API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch playlists";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Create a new playlist
export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean; playlist?: unknown } | { error: string }>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, isPublic, coverImage, items } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Playlist name is required" },
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

    // Create playlist with items in a transaction
    const playlist = await db.playlist.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        isPublic: isPublic || false,
        coverImage: coverImage || null,
        items: {
          create: (items || []).map((item: {
            tmdbId: number;
            mediaType: "movie" | "tv";
            title: string;
            posterPath?: string | null;
            backdropPath?: string | null;
            releaseDate?: string | null;
            firstAirDate?: string | null;
            order?: number;
          }, index: number) => ({
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath || null,
            backdropPath: item.backdropPath || null,
            releaseDate: item.releaseDate || null,
            firstAirDate: item.firstAirDate || null,
            order: item.order !== undefined ? item.order : index,
          })),
        },
      },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
        youtubeItems: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { 
            items: true,
            youtubeItems: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, playlist });
  } catch (error) {
    console.error("Create playlist API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create playlist";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

