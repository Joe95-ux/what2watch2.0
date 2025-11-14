import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// POST - Like a playlist (auto-saves to user's library)
export async function POST(
  request: NextRequest,
  { params }: { params: { playlistId: string } }
) {
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

    const playlistId = params.playlistId;

    // Check if playlist exists
    const playlist = await db.playlist.findUnique({
      where: { id: playlistId },
      select: { id: true, userId: true },
    });

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    // Can't like your own playlist (it's already in your library)
    if (playlist.userId === user.id) {
      return NextResponse.json(
        { error: "Cannot like your own playlist" },
        { status: 400 }
      );
    }

    // Check if already liked
    const existingLike = await db.likedPlaylist.findUnique({
      where: {
        userId_playlistId: {
          userId: user.id,
          playlistId: playlistId,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json(
        { error: "Playlist already liked" },
        { status: 400 }
      );
    }

    // Create liked playlist entry and increment likes count
    await db.$transaction([
      db.likedPlaylist.create({
        data: {
          userId: user.id,
          playlistId: playlistId,
          isReadOnly: true,
        },
      }),
      db.playlist.update({
        where: { id: playlistId },
        data: {
          likesCount: {
            increment: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error liking playlist:", error);
    return NextResponse.json(
      { error: "Failed to like playlist" },
      { status: 500 }
    );
  }
}

// DELETE - Unlike a playlist (removes from user's library)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { playlistId: string } }
) {
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

    const playlistId = params.playlistId;

    // Delete liked playlist entry and decrement likes count
    const deleted = await db.likedPlaylist.deleteMany({
      where: {
        userId: user.id,
        playlistId: playlistId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Playlist not liked" },
        { status: 404 }
      );
    }

    // Decrement likes count
    await db.playlist.update({
      where: { id: playlistId },
      data: {
        likesCount: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unliking playlist:", error);
    return NextResponse.json(
      { error: "Failed to unlike playlist" },
      { status: 500 }
    );
  }
}

// GET - Check if current user has liked the playlist
export async function GET(
  request: NextRequest,
  { params }: { params: { playlistId: string } }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ isLiked: false });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ isLiked: false });
    }

    const playlistId = params.playlistId;

    const liked = await db.likedPlaylist.findUnique({
      where: {
        userId_playlistId: {
          userId: user.id,
          playlistId: playlistId,
        },
      },
    });

    return NextResponse.json({ isLiked: !!liked });
  } catch (error) {
    console.error("Error checking like status:", error);
    return NextResponse.json({ isLiked: false });
  }
}

