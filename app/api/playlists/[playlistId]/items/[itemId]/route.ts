import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// PATCH - Update playlist item (note or order)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string; itemId: string }> }
): Promise<NextResponse<{ success: boolean; playlistItem?: unknown } | { error: string }>> {
  try {
    const { playlistId, itemId } = await params;
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

    // Verify playlist exists and user owns it
    const playlist = await db.playlist.findUnique({
      where: { id: playlistId },
      select: { userId: true },
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    if (playlist.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { note, order } = body;

    // Validate that at least one field is provided
    if (note === undefined && order === undefined) {
      return NextResponse.json(
        { error: "At least one field (note or order) must be provided" },
        { status: 400 }
      );
    }

    // Validate note
    if (note !== undefined && typeof note !== "string" && note !== null) {
      return NextResponse.json(
        { error: "Note must be a string or null" },
        { status: 400 }
      );
    }

    // Validate order
    if (order !== undefined && (typeof order !== "number" || order < 1)) {
      return NextResponse.json(
        { error: "Order must be a positive number" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: { note?: string | null; order?: number } = {};
    if (note !== undefined) {
      updateData.note = note;
    }
    if (order !== undefined) {
      updateData.order = order;
    }

    // If order is being updated, we need to shift all other items to maintain unique sequential orders
    if (order !== undefined) {
      // Get all items in the playlist
      const allItems = await db.playlistItem.findMany({
        where: { playlistId },
        orderBy: { order: "asc" },
      });

      const currentItem = allItems.find((item) => item.id === itemId);
      if (!currentItem) {
        return NextResponse.json({ error: "Playlist item not found" }, { status: 404 });
      }

      const currentIndex = allItems.findIndex((item) => item.id === itemId);
      const newIndex = order - 1; // Convert to 0-based index

      if (newIndex < 0 || newIndex >= allItems.length) {
        return NextResponse.json(
          { error: `Order must be between 1 and ${allItems.length}` },
          { status: 400 }
        );
      }

      // Remove item from current position
      const [movedItem] = allItems.splice(currentIndex, 1);
      // Insert at new position
      allItems.splice(newIndex, 0, movedItem);

      // Only update items that actually changed position
      const updates = allItems
        .map((item, idx) => ({ item, newOrder: idx + 1 }))
        .filter(({ item, newOrder }) => item.order !== newOrder);

      if (updates.length > 0) {
        await Promise.all(
          updates.map(({ item, newOrder }) =>
            db.playlistItem.update({
              where: { id: item.id },
              data: { order: newOrder },
            })
          )
        );
      }
    } else if (note !== undefined) {
      // Only updating note
      await db.playlistItem.update({
        where: { id: itemId, playlistId },
        data: { note },
      });
    }

    // Fetch the updated item
    const updatedItem = await db.playlistItem.findUnique({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true, playlistItem: updatedItem });
  } catch (error) {
    console.error("Update playlist item API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update playlist item";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

