import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// PATCH - Update watchlist item (note or order)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
): Promise<NextResponse<{ success: boolean; watchlistItem?: unknown } | { error: string }>> {
  try {
    const { itemId } = await params;
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
    if (order !== undefined && (typeof order !== "number" || order < 0)) {
      return NextResponse.json(
        { error: "Order must be a non-negative number" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: { note?: string | null; order?: number } = {};
    if (note !== undefined) {
      updateData.note = note;
    }

    // If order is being updated, we need to shift all other items to maintain unique sequential orders
    if (order !== undefined) {
      // Get the current item to find its old order
      const currentItem = await db.watchlistItem.findUnique({
        where: {
          id: itemId,
          userId: user.id,
        },
        select: { order: true },
      });

      if (!currentItem) {
        return NextResponse.json(
          { error: "Watchlist item not found or unauthorized" },
          { status: 404 }
        );
      }

      const oldOrder = currentItem.order || 0;
      const newOrder = order;

      // If order hasn't changed, just update note if provided
      if (oldOrder === newOrder) {
        if (note !== undefined) {
          const watchlistItem = await db.watchlistItem.updateMany({
            where: {
              id: itemId,
              userId: user.id,
            },
            data: { note },
          });

          if (watchlistItem.count === 0) {
            return NextResponse.json(
              { error: "Watchlist item not found or unauthorized" },
              { status: 404 }
            );
          }
        }

        const updatedItem = await db.watchlistItem.findUnique({
          where: { id: itemId },
        });

        return NextResponse.json({ success: true, watchlistItem: updatedItem });
      }

      // Get all watchlist items sorted by order
      const allItems = await db.watchlistItem.findMany({
        where: {
          userId: user.id,
          order: { gt: 0 }, // Only items with order > 0
        },
        select: { id: true, order: true },
        orderBy: { order: "asc" },
      });

      // Calculate new orders for all items
      const itemsToUpdate: Array<{ id: string; order: number }> = [];

      if (newOrder > oldOrder) {
        // Moving down: shift items between oldOrder and newOrder up by 1
        for (const item of allItems) {
          if (item.id === itemId) {
            itemsToUpdate.push({ id: item.id, order: newOrder });
          } else if (item.order > oldOrder && item.order <= newOrder) {
            itemsToUpdate.push({ id: item.id, order: item.order - 1 });
          } else {
            itemsToUpdate.push({ id: item.id, order: item.order });
          }
        }
      } else {
        // Moving up: shift items between newOrder and oldOrder down by 1
        for (const item of allItems) {
          if (item.id === itemId) {
            itemsToUpdate.push({ id: item.id, order: newOrder });
          } else if (item.order >= newOrder && item.order < oldOrder) {
            itemsToUpdate.push({ id: item.id, order: item.order + 1 });
          } else {
            itemsToUpdate.push({ id: item.id, order: item.order });
          }
        }
      }

      // Update all affected items
      await Promise.all(
        itemsToUpdate.map((item) =>
          db.watchlistItem.updateMany({
            where: {
              id: item.id,
              userId: user.id,
            },
            data: { order: item.order },
          })
        )
      );

      // If note is also being updated, update it
      if (note !== undefined) {
        await db.watchlistItem.updateMany({
          where: {
            id: itemId,
            userId: user.id,
          },
          data: { note },
        });
      }
    } else if (note !== undefined) {
      // Only updating note
      const watchlistItem = await db.watchlistItem.updateMany({
        where: {
          id: itemId,
          userId: user.id,
        },
        data: { note },
      });

      if (watchlistItem.count === 0) {
        return NextResponse.json(
          { error: "Watchlist item not found or unauthorized" },
          { status: 404 }
        );
      }
    }

    // Fetch the updated item
    const updatedItem = await db.watchlistItem.findUnique({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true, watchlistItem: updatedItem });
  } catch (error) {
    console.error("Update watchlist item API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update watchlist item";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

