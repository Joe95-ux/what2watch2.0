import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// PATCH - Update list item positions
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
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

    const { listId } = await params;

    // Verify list exists and user owns it
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { userId: true },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { items } = body; // Array of { id: string, position: number }

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

    console.log("Reorder List API - received items:", items.length);
    console.log("Reorder List API - list ID:", listId);
    console.log("Reorder List API - sample items:", items.slice(0, 3));

    // Execute all updates in parallel (no transaction needed for independent updates)
    const updateResults = await Promise.all(
      items.map((item: { id: string; position: number }) =>
        db.listItem.updateMany({
          where: {
            id: item.id,
            listId: listId, // Ensure item belongs to this list
          },
          data: {
            position: item.position, // This is the actual position value (1, 2, 3, etc.), not array index
          },
        })
      )
    );

    // Check if all updates were successful
    const failedUpdates: Array<{ id: string; position: number }> = [];
    items.forEach((item: { id: string; position: number }, index: number) => {
      if (updateResults[index].count === 0) {
        console.warn(`No item updated for ID: ${item.id}, position: ${item.position}`);
        failedUpdates.push(item);
      }
    });

    console.log("Reorder List API - update results:", {
      total: updateResults.length,
      successful: updateResults.length - failedUpdates.length,
      failed: failedUpdates.length,
    });

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
    const verifyItems = await db.listItem.findMany({
      where: {
        id: { in: sampleIds },
        listId: listId,
      },
      select: { id: true, position: true },
    });
    console.log("Reorder List API - verification sample:", verifyItems);
    console.log("Reorder List API - expected positions:", items.slice(0, 3).map((item) => ({ id: item.id, position: item.position })));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder list API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to reorder list";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

