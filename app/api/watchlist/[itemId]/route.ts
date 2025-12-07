import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// PATCH - Update watchlist item (note or order)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { itemId: string } }
): Promise<NextResponse<{ success: boolean; watchlistItem?: unknown } | { error: string }>> {
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
    if (order !== undefined) {
      updateData.order = order;
    }

    // Update the watchlist item
    const watchlistItem = await db.watchlistItem.updateMany({
      where: {
        id: params.itemId,
        userId: user.id, // Ensure user owns the item
      },
      data: updateData,
    });

    if (watchlistItem.count === 0) {
      return NextResponse.json(
        { error: "Watchlist item not found or unauthorized" },
        { status: 404 }
      );
    }

    // Fetch the updated item
    const updatedItem = await db.watchlistItem.findUnique({
      where: { id: params.itemId },
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

