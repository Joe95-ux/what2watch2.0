import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// PATCH - Update playlist item orders
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
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

    const { playlistId } = await params;

    // Verify playlist exists and user owns it
    const playlist = await db.playlist.findUnique({
      where: { id: playlistId },
      select: { userId: true },
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    if (playlist.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { items, itemType } = body; // items: Array of { id: string, order: number }, itemType: "tmdb" | "youtube"

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items must be an array" },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Items array cannot be empty" },
        { status: 400 }
      );
    }

    // Determine if we're updating TMDB items or YouTube items
    const isYouTube = itemType === "youtube";

    // Execute all updates in parallel
    const updateResults = await Promise.all(
      items.map((item: { id: string; order: number }) => {
        if (isYouTube) {
          return db.youTubePlaylistItem.updateMany({
            where: {
              id: item.id,
              playlistId: playlistId,
            },
            data: {
              order: item.order,
            },
          });
        } else {
          return db.playlistItem.updateMany({
            where: {
              id: item.id,
              playlistId: playlistId,
            },
            data: {
              order: item.order,
            },
          });
        }
      })
    );

    // Check if all updates were successful
    const failedUpdates: Array<{ id: string; order: number }> = [];
    items.forEach((item: { id: string; order: number }, index: number) => {
      if (updateResults[index].count === 0) {
        failedUpdates.push(item);
      }
    });

    if (failedUpdates.length > 0) {
      return NextResponse.json(
        { 
          error: `Failed to update ${failedUpdates.length} item(s)`,
          failedIds: failedUpdates.map((r) => r.id)
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder playlist API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to reorder playlist";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

