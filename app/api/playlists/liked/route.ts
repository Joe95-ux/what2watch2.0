import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Get current user's liked playlists
export async function GET(request: NextRequest) {
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

    // Get all liked playlists
    const likedPlaylists = await db.likedPlaylist.findMany({
      where: { userId: user.id },
      include: {
        playlist: {
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
                likedBy: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const playlists = likedPlaylists.map((liked) => ({
      ...liked.playlist,
      isReadOnly: liked.isReadOnly,
      likedAt: liked.createdAt,
      user: liked.playlist.user,
      createdBy: liked.playlist.user,
    }));

    return NextResponse.json({ playlists });
  } catch (error) {
    console.error("Error fetching liked playlists:", error);
    return NextResponse.json(
      { error: "Failed to fetch liked playlists" },
      { status: 500 }
    );
  }
}

