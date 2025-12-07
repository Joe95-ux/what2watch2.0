import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// PATCH - Update watchlist item order
export async function PATCH(request: NextRequest): Promise<NextResponse<{ success: boolean } | { error: string }>> {
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
    const { items } = body; // Array of { id: string, order: number }

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

    console.log("Reorder API - received items:", items.length);
    console.log("Reorder API - user ID:", user.id);
    console.log("Reorder API - sample items:", items.slice(0, 3));

    // Update all items and verify they were updated
    const updateResults = await Promise.all(
      items.map(async (item: { id: string; order: number }) => {
        const result = await db.watchlistItem.updateMany({
          where: {
            id: item.id,
            userId: user.id, // Ensure user owns the item
          },
          data: {
            order: item.order,
          },
        });
        if (result.count === 0) {
          console.warn(`No item updated for ID: ${item.id}, order: ${item.order}`);
        }
        return { id: item.id, order: item.order, updated: result.count > 0 };
      })
    );

    console.log("Reorder API - update results:", {
      total: updateResults.length,
      successful: updateResults.filter((r) => r.updated).length,
      failed: updateResults.filter((r) => !r.updated).length,
    });

    // Check if any items failed to update
    const failedUpdates = updateResults.filter((r) => !r.updated);
    if (failedUpdates.length > 0) {
      console.error("Some items failed to update:", failedUpdates);
      return NextResponse.json(
        { 
          error: `Failed to update ${failedUpdates.length} item(s)`,
          failedIds: failedUpdates.map((r) => r.id)
        },
        { status: 400 }
      );
    }

    // Verify the updates by fetching a few items
    const sampleIds = items.slice(0, 3).map((item) => item.id);
    const verifyItems = await db.watchlistItem.findMany({
      where: {
        id: { in: sampleIds },
        userId: user.id,
      },
      select: { id: true, order: true },
    });
    console.log("Reorder API - verification sample:", verifyItems);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder watchlist API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to reorder watchlist";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

