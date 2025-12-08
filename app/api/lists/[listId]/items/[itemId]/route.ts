import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// PATCH - Update list item (note or position)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string; itemId: string }> }
): Promise<NextResponse<{ success: boolean; listItem?: unknown } | { error: string }>> {
  try {
    const { listId, itemId } = await params;
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

    // Verify list exists and user owns it
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { userId: true },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { note, position } = body;

    // Validate that at least one field is provided
    if (note === undefined && position === undefined) {
      return NextResponse.json(
        { error: "At least one field (note or position) must be provided" },
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

    // Validate position
    if (position !== undefined && (typeof position !== "number" || position < 1)) {
      return NextResponse.json(
        { error: "Position must be a positive number" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: { note?: string | null; position?: number } = {};
    if (note !== undefined) {
      updateData.note = note;
    }
    if (position !== undefined) {
      updateData.position = position;
    }

    // If position is being updated, we need to shift all other items to maintain unique sequential positions
    if (position !== undefined) {
      // Get all items in the list
      const allItems = await db.listItem.findMany({
        where: { listId },
        orderBy: { position: "asc" },
      });

      const currentItem = allItems.find((item) => item.id === itemId);
      if (!currentItem) {
        return NextResponse.json({ error: "List item not found" }, { status: 404 });
      }

      const currentIndex = allItems.findIndex((item) => item.id === itemId);
      const newIndex = position - 1; // Convert to 0-based index

      if (newIndex < 0 || newIndex >= allItems.length) {
        return NextResponse.json(
          { error: `Position must be between 1 and ${allItems.length}` },
          { status: 400 }
        );
      }

      // Remove item from current position
      const [movedItem] = allItems.splice(currentIndex, 1);
      // Insert at new position
      allItems.splice(newIndex, 0, movedItem);

      // Reassign sequential positions to all items
      await Promise.all(
        allItems.map((item, idx) =>
          db.listItem.update({
            where: { id: item.id },
            data: { position: idx + 1 },
          })
        )
      );
    } else if (note !== undefined) {
      // Only updating note
      await db.listItem.update({
        where: { id: itemId, listId },
        data: { note },
      });
    }

    // Fetch the updated item
    const updatedItem = await db.listItem.findUnique({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true, listItem: updatedItem });
  } catch (error) {
    console.error("Update list item API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update list item";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

